// ==========================================================
// CONSTANTES GLOBAIS E VARIÁVEIS DE DADOS
// ==========================================================
const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon/';
const POKEAPI_TYPE_URL = 'https://pokeapi.co/api/v2/type/';
const POKEAPI_SPECIES_URL = 'https://pokeapi.co/api/v2/pokemon-species/';
const FIRST_GEN_LIMIT = 151; // Limite da Geração 1 (Kanto)

// CONSTANTES PARA O HISTÓRICO DE PESQUISA
const SEARCH_HISTORY_KEY = 'pokemonSearchHistory';
const MAX_HISTORY_SIZE = 5;

let pokemonNames = [];
let FIRERED_GUIDE_DATA = {};

// ==========================================================
// 1. CARREGAMENTO E DADOS INICIAIS
// ==========================================================

async function loadData() {
    await loadPokemonNames();
    await loadGuideData();
    
    // Carrega o guia específico se a URL for correspondente
    const urlPath = window.location.pathname;
    if (urlPath.includes('tms.html')) {
        carregarGuiaVersao('tms');
    } else if (urlPath.includes('hms.html')) {
        carregarGuiaVersao('hms');
    } else if (urlPath.includes('itens.html')) {
        carregarGuiaVersao('itens');
    }
}

async function loadPokemonNames() {
    try {
        // Busca até a Geração 2 para incluir evoluções como Pichu/Steelix
        const response = await fetch(`${POKEAPI_URL}?limit=251`); 
        const data = await response.json();
        pokemonNames = data.results.map(p => p.name);
    } catch (error) {
        console.error("Erro ao carregar nomes de Pokémon:", error);
    }
}

async function loadGuideData() {
    const fetchData = async (path) => {
        try {
            const response = await fetch(path); 
            if (!response.ok) {
                throw new Error(`Falha no HTTP: Status ${response.status} para ${path}.`);
            }
            return response.json();
        } catch (error) {
            console.error(`Detalhes da falha ao carregar ${path}:`, error);
            throw new Error(`Falha ao carregar ${path}`); 
        }
    };

    try {
        const [tms, hms, itens] = await Promise.all([
            fetchData('data/tms_frlg.json'),
            fetchData('data/hms_frlg.json'),
            fetchData('data/itens_frlg.json')
        ]);
        
        const formatMoveData = (item) => ({
            ...item,
            move_name: item.move ? item.move.replace(/-/g, ' ') : 'Desconhecido'
        });

        FIRERED_GUIDE_DATA = { 
            tms: tms.map(formatMoveData), 
            hms: hms.map(formatMoveData), 
            itens 
        };
    } catch (error) {
        FIRERED_GUIDE_DATA = { tms: [], hms: [], itens: [] };
        console.warn("Aviso: Falha ao carregar dados de guia. A aplicação continuará.");
    }
}
document.addEventListener('DOMContentLoaded', loadData); 

// ==========================================================
// 2. FUNÇÕES DE BUSCA E UI (COM HISTÓRICO)
// ==========================================================

function searchEvolutionPokemon(pokemonName) {
    const inputElement = document.getElementById('pokemonSearchInput');
    if (inputElement) {
        const formattedName = pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1);
        inputElement.value = formattedName;
    }
    
    buscarPokemon();
    
    // Oculta sugestões após a busca
    const suggestionsDiv = document.getElementById('suggestions');
    if (suggestionsDiv) {
        suggestionsDiv.classList.add('hidden');
    }
}


/**
 * Gerencia as sugestões de pesquisa em tempo real e o histórico.
 */
function handleInput(event) {
    const input = event.target.value.toLowerCase().trim();
    const suggestionsDiv = document.getElementById('suggestions');

    if (!suggestionsDiv) return;

    if (input.length < 2 && input.length >= 0) {
        // Se o input está quase vazio, mostra o Histórico de Pesquisa
        mostrarHistorico(suggestionsDiv);
        return;
    }

    // Se o input tem 2 ou mais caracteres, mostra sugestões em tempo real
    const filteredNames = pokemonNames.filter(name => name.startsWith(input)).slice(0, 10);
    mostrarSugestoes(filteredNames, suggestionsDiv);
}

/**
 * Renderiza as sugestões em tempo real.
 */
function mostrarSugestoes(suggestions, targetDiv) {
    targetDiv.innerHTML = '';
    
    if (suggestions.length === 0) {
        targetDiv.classList.add('hidden');
        return;
    }

    suggestions.forEach(name => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        item.onclick = () => {
            document.getElementById('pokemonSearchInput').value = name;
            targetDiv.classList.add('hidden');
            buscarPokemon();
        };
        targetDiv.appendChild(item);
    });

    targetDiv.classList.remove('hidden');
}


function limparBusca() {
    document.getElementById('pokemonSearchInput').value = '';
    document.getElementById('pokemonInfo').innerHTML = '<p>Use o campo acima para buscar um Pokémon.</p>';
    
    const sections = ['typeGuide', 'strategyGuide', 'evolutionChain', 'baseStats', 'movesGuide'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // Mostra o histórico na limpeza
    const suggestionsDiv = document.getElementById('suggestions');
    if (suggestionsDiv) {
        mostrarHistorico(suggestionsDiv);
    }
}


function updateSearchHistory(pokemonName) {
    let history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    
    const lowerName = pokemonName.toLowerCase();
    
    // Remove duplicatas (case insensitive)
    history = history.filter(name => name.toLowerCase() !== lowerName);
    
    // Adiciona o novo nome no início
    history.unshift(pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)); 
    
    // Limita o tamanho do histórico
    history = history.slice(0, MAX_HISTORY_SIZE);
    
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

function mostrarHistorico(targetDiv) {
    const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    
    targetDiv.innerHTML = ''; 

    if (history.length === 0) {
        targetDiv.classList.add('hidden');
        return;
    }
    
    targetDiv.innerHTML = '<div class="history-title p-2">Pesquisas Recentes:</div>';
    
    history.forEach(name => {
        const item = document.createElement('div');
        item.className = 'suggestion-item history-item';
        item.textContent = name; 
        item.onclick = () => {
            document.getElementById('pokemonSearchInput').value = name;
            targetDiv.classList.add('hidden');
            buscarPokemon();
        };
        targetDiv.appendChild(item);
    });
    
    targetDiv.classList.remove('hidden');
}


async function buscarPokemon() {
    const query = document.getElementById('pokemonSearchInput').value.toLowerCase().trim(); 
    const pokemonInfoDiv = document.getElementById('pokemonInfo');
    const sections = ['typeGuide', 'strategyGuide', 'evolutionChain', 'baseStats', 'movesGuide'];
    
    pokemonInfoDiv.innerHTML = '<p>Buscando...</p>';
    sections.map(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('suggestions')?.classList.add('hidden'); 

    if (!query) {
        pokemonInfoDiv.innerHTML = '<p style="color: #e76f51;">Por favor, digite o nome ou ID de um Pokémon.</p>';
        return;
    }

    try {
        const pokemonResponse = await fetch(`${POKEAPI_URL}${query}`);
        if (!pokemonResponse.ok) {
            pokemonInfoDiv.innerHTML = `<p style="color: #e76f51;">Pokémon "${query}" não encontrado.</p>`;
            return;
        }

        const pokemonData = await pokemonResponse.json();
        const tipos = pokemonData.types.map(typeInfo => typeInfo.type.name);

        exibirPokemon(pokemonData, pokemonInfoDiv, tipos);
        updateSearchHistory(pokemonData.name); 

        const speciesResponse = await fetch(`${POKEAPI_SPECIES_URL}${pokemonData.id}`);
        const speciesData = await speciesResponse.json();

        exibirBaseStats(pokemonData.stats, document.getElementById('baseStats')); 
        await buscarCadeiaEvolutiva(speciesData, document.getElementById('evolutionChain'));
        await buscarGuiaDeTiposCompleto(tipos, document.getElementById('typeGuide'), pokemonData.id);
        await buscarLocalizacao(pokemonData, document.getElementById('strategyGuide')); 
        exibirMovimentos(pokemonData.moves, document.getElementById('movesGuide'));

    } catch (error) {
        console.error('Erro geral na requisição:', error);
        pokemonInfoDiv.innerHTML = `<p style="color: #e76f51;">Ocorreu um erro de conexão ou processamento. (Verifique o console F12)</p>`;
    }
}


// ==========================================================
// 3. FUNÇÕES DE EVOLUÇÃO (CORREÇÃO DA PEDRA)
// ==========================================================

/**
 * Retorna uma string formatada com os detalhes da condição de evolução.
 * **CORREÇÃO APLICADA AQUI:** Garante que o nome da pedra de evolução seja formatado corretamente.
 */
function getEvolutionDetailsString(detail) {
    // Substitui hífens no nome do trigger (ex: 'level-up' -> 'level up')
    const trigger = detail.trigger.name.replace(/-/g, ' '); 
    let details = '';
    
    // 1. CORREÇÃO: Prioriza e formata a evolução por ITEM (PEDRA)
    if (trigger === 'use-item' && detail.item) {
        let itemName = detail.item.name;
        
        // CORREÇÃO: Divide por hífen, capitaliza e junta com espaço
        // Ex: 'thunder-stone' -> ['thunder', 'stone'] -> ['Thunder', 'Stone'] -> 'Thunder Stone'
        const formattedItemName = itemName.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        details = `Usando <strong>${formattedItemName}</strong>`;
    } 
    // 2. Prioriza o NÍVEL MÍNIMO (Level Up)
    else if (detail.min_level) {
        details = `LV <strong>${detail.min_level}</strong>`;
    } 
    // 3. Trata Troca
    else if (trigger === 'trade') {
        details = 'Troca';
    } 
    // 4. Trata outras condições de Level Up
    else if (trigger === 'level-up') {
         if (detail.min_happiness) {
            details = `Felicidade <strong>${detail.min_happiness}+</strong>`;
        } else if (detail.time_of_day) {
            details = `Level Up (Horário: ${detail.time_of_day})`;
        } else {
            details = `Level Up (Condição)`; 
        }
    } 
    // 5. Caso Padrão (Fallback, ex: 'shed' para Shedinja, ou 'use-item' sem item)
    else {
        // Se não foi tratada acima (como use-item) e o trigger é genérico,
        // capitaliza e usa o nome do trigger (ex: "Use Item")
        details = trigger.charAt(0).toUpperCase() + trigger.slice(1);
    }
    
    let extraDetails = [];

    // Adiciona detalhes extras à condição principal (se houver)
    if (detail.held_item) { 
        const heldItemName = detail.held_item.name.replace('-item', '').replace(/-/g, ' ');
        extraDetails.push(`Segurando ${heldItemName}`);
    }
    if (detail.gender !== null) {
        extraDetails.push(detail.gender === 1 ? '♀ Fêmea' : '♂ Macho');
    }
    if (detail.known_move) {
         extraDetails.push(`Movimento: ${detail.known_move.name.replace('-', ' ')}`);
    }

    if (extraDetails.length > 0) {
        if (details) {
            details += ` + (${extraDetails.join(', ')})`;
        } else {
             details += `${extraDetails.join(', ')}`;
        }
    }
    
    // Se o resultado final ainda estiver vazio, usa o trigger capitalizado
    if (!details) {
         details = trigger.charAt(0).toUpperCase() + trigger.slice(1);
    }
    
    return details.replace(/\s+/g, ' '); 
}

async function buscarCadeiaEvolutiva(speciesData, targetElement) {
    const chainUrl = speciesData.evolution_chain?.url;
    let html = '<h3>🌱 Cadeia Evolutiva (Kanto)</h3>'; 

    if (!chainUrl) {
        html += `<p style="color: #94a3b8;">Nenhuma cadeia evolutiva encontrada.</p>`;
        targetElement.innerHTML = html;
        targetElement.classList.remove('hidden');
        return;
    }

    const chainResponse = await fetch(chainUrl);
    const chainData = await chainResponse.json();
    const chain = chainData.chain;

    const baseId = chain.species.url.split('/').slice(-2, -1)[0];
    if (parseInt(baseId) > FIRST_GEN_LIMIT) {
        html += `<p style="text-align: center; margin-top: 10px; color: #94a3b8;">Pokémon não pertence à Geração 1 (Kanto).</p>`;
        targetElement.innerHTML = html;
        targetElement.classList.remove('hidden');
        return;
    }

    html += await renderEvolutionChain(chain, speciesData.name);
    targetElement.innerHTML = html;
    targetElement.classList.remove('hidden');
}

async function renderEvolutionChain(chainData, currentSearchName) {
    let html = '<div class="evolution-list-container d-flex flex-wrap justify-content-center align-items-center gap-4 py-3">';
    const imageCache = {};

    const getPokemonImage = async (name) => {
        if (!imageCache[name]) {
            try {
                const response = await fetch(`${POKEAPI_URL}${name}`);
                if (!response.ok) return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                const data = await response.json();
                imageCache[name] = data.sprites.front_default;
            } catch (error) {
                return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            }
        }
        return imageCache[name];
    };
    
    const processChain = async (chainNode) => {
        const currentPokemonName = chainNode.species.name;
        const currentPokemonId = chainNode.species.url.split('/').slice(-2, -1)[0];
        const isCurrentSearch = currentPokemonName === currentSearchName;

        if (parseInt(currentPokemonId) > FIRST_GEN_LIMIT) {
            return; 
        }

        const currentImageUrl = await getPokemonImage(currentPokemonName);
        
        // 1. Renderiza o Pokémon atual
        html += `
            <div class="text-center evolution-step evolution-clickable" onclick="searchEvolutionPokemon('${currentPokemonName}')">
                <img src="${currentImageUrl}" alt="${currentPokemonName}" style="width: 96px; height: 96px;" class="bg-dark rounded p-1 ${isCurrentSearch ? 'border border-primary' : ''}"/>
                <p class="mt-1 mb-0 fw-bold text-uppercase ${isCurrentSearch ? 'text-primary' : ''}">${currentPokemonName}</p>
            </div>
        `;

        // 2. Processa as próximas evoluções
        if (chainNode.evolves_to.length > 0) {
            
            if (chainNode.evolves_to.length > 1) {
                html += '<div class="d-flex flex-column align-items-center justify-content-center mx-2" style="min-width: 120px;">';
                html += '<span class="fs-4 text-primary">⬇️</span><p class="text-secondary fw-bold mb-0">RAMIFICAÇÃO</p></div>';
                
                html += '<div class="d-flex flex-wrap justify-content-center">'; 
                await Promise.all(chainNode.evolves_to.map(async (nextEvo) => {
                    const nextId = parseInt(nextEvo.species.url.split('/').slice(-2, -1)[0]);
                    if (nextId > FIRST_GEN_LIMIT) return;

                    const detailsList = nextEvo.evolution_details.map(getEvolutionDetailsString);
                    const detailsString = detailsList.join(' OU ');
                    const nextImageUrl = await getPokemonImage(nextEvo.species.name);

                    html += `
                        <div class="d-flex flex-column align-items-center justify-content-center p-3">
                            <div class="text-center mb-1">
                                <p class="text-secondary fw-bold mb-0" style="font-size: 0.9em; max-width: 120px; line-height: 1.2;">${detailsString}</p>
                            </div>
                            <div class="text-center evolution-step evolution-clickable" onclick="searchEvolutionPokemon('${nextEvo.species.name}')">
                                <img src="${nextImageUrl}" alt="${nextEvo.species.name}" style="width: 96px; height: 96px;" class="bg-dark rounded p-1"/>
                                <p class="mt-1 mb-0 fw-bold text-uppercase">${nextEvo.species.name}</p>
                            </div>
                        </div>
                    `;
                }));
                html += '</div>'; 

            } else { 
                const nextEvo = chainNode.evolves_to[0];
                const nextId = parseInt(nextEvo.species.url.split('/').slice(-2, -1)[0]);

                if (nextId <= FIRST_GEN_LIMIT) {
                    const detailsList = nextEvo.evolution_details.map(getEvolutionDetailsString);
                    const detailsString = detailsList.join(' OU ');
                    
                    // Adiciona Separador
                    html += `
                        <div class="d-flex flex-column align-items-center justify-content-center mx-2" style="min-width: 120px;">
                            <div class="text-center mb-1">
                                <p class="text-secondary fw-bold mb-0" style="font-size: 0.9em; max-width: 120px; line-height: 1.2;">${detailsString}</p>
                                <span class="fs-4 text-primary">➡️</span>
                            </div>
                        </div>
                    `;
                    // Processa o próximo estágio recursivamente
                    await processChain(nextEvo);
                }
            }
        }
    };
    
    await processChain(chainData);

    html += '</div>';
    return html;
}

// ==========================================================
// 4. FUNÇÕES DE EXIBIÇÃO DE CONTEÚDO
// ==========================================================

function exibirPokemon(data, targetElement, tipos) {
    const nome = data.name;
    const id = data.id;
    const imagemUrl = data.sprites.front_default;
    const shinyUrl = data.sprites.front_shiny;
    const isLegendary = [144, 145, 146, 150, 151].includes(id);

    const tipoTags = tipos.map(tipo => 
        `<span class="type-tag type-${tipo}">${tipo.toUpperCase()}</span>`
    ).join('');

    let raridade = '';
    if (isLegendary) {
        raridade = '<span style="color:#ffd166; font-weight: bold;">(LENDÁRIO/MÍTICO)</span>';
    } else if (id <= FIRST_GEN_LIMIT) {
        raridade = `(Geração 1)`;
    }

    targetElement.innerHTML = `
        <div class="pokemon-sprites d-flex justify-content-center gap-5 mb-3">
            <div class="text-center">
                <img src="${imagemUrl}" alt="${nome} normal" />
                <p class="mt-2 mb-0">Normal</p>
            </div>
            <div class="text-center">
                <img src="${shinyUrl}" alt="${nome} shiny" />
                <p class="shiny-label mt-2 mb-0">✨ Shiny</p>
            </div>
        </div>
        <h2 class="text-center">${nome.toUpperCase()} (#${id}) ${raridade}</h2>
        <p class="text-center"><strong>Tipo(s):</strong> ${tipoTags}</p>
        <p class="text-center"><strong>Altura:</strong> ${data.height / 10} m | <strong>Peso:</strong> ${data.weight / 10} kg</p>
    `;
}

function exibirBaseStats(statsData, targetElement) {
    let totalStats = 0;
    let statsHtml = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Stat</th>
                    <th>Base</th>
                    <th>Gráfico (Max 255)</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsData.forEach(statEntry => {
        const statName = statEntry.stat.name.replace('-', ' ').toUpperCase();
        const baseStat = statEntry.base_stat;
        const statClass = statEntry.stat.name.replace('-', '');
        const maxWidth = 255; 
        const barWidth = (baseStat / maxWidth) * 100;

        totalStats += baseStat;

        statsHtml += `
            <tr>
                <th><strong>${statName}</strong></th>
                <td>${baseStat}</td>
                <td>
                    <div class="stat-bar-container">
                        <div class="stat-bar ${statClass}-bar" style="width: ${barWidth}%;"></div>
                    </div>
                </td>
            </tr>
        `;
    });

    statsHtml += `
            <tr class="total-stat-row">
                <td><strong>Total</strong></td>
                <td colspan="2">${totalStats}</td>
            </tr>
            </tbody>
        </table>
    `;

    targetElement.innerHTML = statsHtml;
    targetElement.classList.remove('hidden');
}


async function buscarGuiaDeTiposCompleto(tipos, targetElement, pokemonId) {
    const defenseRelations = { '4x': { types: [] }, '2x': { types: [] }, '0.5x': { types: [] }, '0.25x': { types: [] }, '0x': { types: [] } };
    const attackRelations = { '2x': { types: [] }, '0.5x': { types: [] }, '0x': { types: [] } };
    
    // 1. Defesa (Resistências e Fraquezas)
    const typePromises = tipos.map(tipo => fetch(`${POKEAPI_TYPE_URL}${tipo}`).then(res => res.json()));
    const typeDataArray = await Promise.all(typePromises);

    const typeEfficacies = {}; 
    typeDataArray.forEach(typeData => {
        typeData.damage_relations.double_damage_from.forEach(typeInfo => {
            typeEfficacies[typeInfo.name] = (typeEfficacies[typeInfo.name] || 1) * 2;
        });
        typeData.damage_relations.half_damage_from.forEach(typeInfo => {
            typeEfficacies[typeInfo.name] = (typeEfficacies[typeInfo.name] || 1) * 0.5;
        });
        typeData.damage_relations.no_damage_from.forEach(typeInfo => {
            typeEfficacies[typeInfo.name] = 0;
        });
    });

    for (const typeName in typeEfficacies) {
        const factor = typeEfficacies[typeName];
        const tag = `<span class="type-tag type-${typeName}">${typeName.toUpperCase()}</span>`;
        if (factor === 4) defenseRelations['4x'].types.push(tag);
        else if (factor === 2) defenseRelations['2x'].types.push(tag);
        else if (factor === 0.5) defenseRelations['0.5x'].types.push(tag);
        else if (factor === 0.25) defenseRelations['0.25x'].types.push(tag);
        else if (factor === 0) defenseRelations['0x'].types.push(tag);
    }
    
    // 2. Ataque (Eficácia dos movimentos)
    for (const tipo of tipos) {
        const response = await fetch(`${POKEAPI_TYPE_URL}${tipo}`);
        const data = await response.json();
        
        data.damage_relations.double_damage_to.forEach(typeInfo => {
            attackRelations['2x'].types.push(typeInfo.name);
        });
        data.damage_relations.half_damage_to.forEach(typeInfo => {
            attackRelations['0.5x'].types.push(typeInfo.name);
        });
        data.damage_relations.no_damage_to.forEach(typeInfo => {
            attackRelations['0x'].types.push(typeInfo.name);
        });
    }

    const uniqueAttackRelations = {};
    for (const key in attackRelations) {
        const uniqueTypes = [...new Set(attackRelations[key].types)];
        uniqueAttackRelations[key] = uniqueTypes.map(name => `<span class="type-tag type-${name}">${name.toUpperCase()}</span>`);
    }

    let html = '<h3>⚔️ Tabela de Vantagens e Desvantagens</h3>';
    html += '<p style="font-style: italic; color: #94a3b8;">* A eficácia é calculada com base no(s) tipo(s) do Pokémon pesquisado.</p>';
    
    html += `<div class="row">`;
    
    // Coluna de Defesa
    html += `
        <div class="col-12 col-md-6 mb-4">
            <div class="pokemon-card">
                <h4>🛡️ Defesa (Dano Recebido)</h4>
                
                <p><strong>4x Fraqueza:</strong> ${defenseRelations['4x'].types.join(' ') || '—'}</p>
                <p><strong>2x Fraqueza:</strong> ${defenseRelations['2x'].types.join(' ') || '—'}</p>
                <hr style="color: #94a3b8;">
                <p><strong>0.5x Resistência:</strong> ${defenseRelations['0.5x'].types.join(' ') || '—'}</p>
                <p><strong>0.25x Super Resistência:</strong> ${defenseRelations['0.25x'].types.join(' ') || '—'}</p>
                <p><strong>0x Imunidade:</strong> ${defenseRelations['0x'].types.join(' ') || '—'}</p>
            </div>
        </div>
    `;

    // Coluna de Ataque (Eficácia)
    html += `
        <div class="col-12 col-md-6 mb-4">
            <div class="pokemon-card">
                <h4>💥 Ataque (Eficácia do Tipo)</h4>
                
                <p><strong>2x Super-Efetivo:</strong> ${uniqueAttackRelations['2x'].join(' ') || '—'}</p>
                <p><strong>0.5x Não-Efetivo:</strong> ${uniqueAttackRelations['0.5x'].join(' ') || '—'}</p>
                <p><strong>0x Sem Efeito:</strong> ${uniqueAttackRelations['0x'].join(' ') || '—'}</p>
                <p style="font-style: italic; color: #94a3b8; margin-top: 15px;">* Estes são os tipos dos movimentos que o Pokémon tem STAB.</p>
            </div>
        </div>
    `;
    
    html += `</div>`; 
    
    targetElement.innerHTML = html;
    targetElement.classList.remove('hidden');
}


const FIRERED_NAME = 'firered';

async function buscarLocalizacao(pokemonData, targetElement) {
    const locationUrl = pokemonData.location_area_encounters;
    let html = '<h3>🗺️ Localização (FireRed)</h3>';
    
    if (!locationUrl) {
        html += `<p style="color: #94a3b8;">Localização de encontro não disponível na API.</p>`;
        targetElement.innerHTML = html;
        targetElement.classList.remove('hidden');
        return;
    }

    const locationResponse = await fetch(locationUrl);
    if (!locationResponse.ok) {
        html += `<p style="color: #94a3b8;">Falha ao buscar dados de localização.</p>`;
        targetElement.innerHTML = html;
        targetElement.classList.remove('hidden');
        return;
    }
    
    const locationData = await locationResponse.json();
    let locationsFound = false;

    if (locationData.length > 0) {
        for (const location of locationData) {
            for (const area of location.version_details) {
                if (area.version.name === FIRERED_NAME) {
                    const locationName = location.location_area.name.replace(/-/g, ' ').toUpperCase();
                    area.encounter_details.forEach(detail => {
                        const method = detail.method.name.replace(/-/g, ' ');
                        const minLevel = detail.min_level;
                        const maxLevel = detail.max_level;
                        
                        html += `
                            <div class="pokemon-card p-3 mb-2">
                                <strong>📍 ${locationName}</strong>
                                <p class="mb-0 text-secondary">Método: ${method.charAt(0).toUpperCase() + method.slice(1)} | Nível: ${minLevel}-${maxLevel}</p>
                            </div>
                        `;
                        locationsFound = true;
                    });
                }
            }
        }
    }

    if (!locationsFound) {
        html += `<p style="color: #94a3b8;">Nenhuma localização de encontro direta encontrada na API para FireRed (Pode ser por evento, troca ou evolução).</p>`;
    }
    targetElement.innerHTML = html;
    targetElement.classList.remove('hidden');
}

function exibirMovimentos(movesData, targetElement) {
    const movesByLevel = [];
    const movesByMachine = [];
    const FIRERED_VERSION_GROUP_NAME = 'firered-leafgreen';

    movesData.forEach(moveEntry => {
        const fireRedDetails = moveEntry.version_group_details.find(
            detail => detail.version_group.name === FIRERED_VERSION_GROUP_NAME
        );

        if (fireRedDetails) {
            const moveName = moveEntry.move.name.replace(/-/g, ' ').toUpperCase();
            const learnMethod = fireRedDetails.move_learn_method.name;
            const levelLearned = fireRedDetails.level_learned_at;

            if (learnMethod === 'level-up') {
                movesByLevel.push({ name: moveName, level: levelLearned });
            } else if (learnMethod === 'machine') {
                movesByMachine.push({ name: moveName });
            }
        }
    });

    movesByLevel.sort((a, b) => a.level - b.level);

    let html = '<h3>🥋 Movimentos Aprendidos (FireRed)</h3>';
    
    // Movimentos por Nível
    html += `<div class="pokemon-card mb-4">
                <h4>Por Level Up</h4>
                <div class="list-group">`; 

    if (movesByLevel.length > 0) {
        movesByLevel.forEach(move => {
            html += `<p class="mb-0 text-start border-bottom py-2"><strong>LV <strong>${move.level}</strong>:</strong> ${move.name}</p>`;
        });
    } else {
        html += `<p class="mb-0 text-secondary py-2">Nenhum movimento aprendido por Level Up nesta versão.</p>`;
    }
    html += `</div></div>`;

    // Movimentos por Máquina (TM/HM)
    html += `<div class="pokemon-card">
                <h4>Por Máquina (TM/HM)</h4>
                <div class="machine-moves-grid">`; 

    if (movesByMachine.length > 0) {
        movesByMachine.forEach(move => {
            html += `<div class="machine-move-item">${move.name}</div>`;
        });
    } else {
        html += `<p class="mb-0 text-secondary py-2" style="grid-column: 1 / -1; text-align: center;">Nenhum movimento aprendido por Máquina nesta versão (ou não registrado na API).</p>`;
    }
    html += `</div></div>`;

    targetElement.innerHTML = html;
    targetElement.classList.remove('hidden');
}


// ==========================================================
// 5. FUNÇÕES DE GUIA (Itens, TMs, HMs)
// ==========================================================

function carregarGuiaVersao(type) {
    const guideData = FIRERED_GUIDE_DATA[type] || [];
    filterGuide(type, true); // Passa 'true' para indicar que é a carga inicial
}


function filterGuide(type, isInitialLoad = false) {
    const inputId = `${type}SearchInput`;
    const targetId = 'versionGuideContent';
    const inputElement = document.getElementById(inputId);
    const targetElement = document.getElementById(targetId);
    
    const dataList = FIRERED_GUIDE_DATA[type] || [];
    
    let title = '';
    if (type === 'tms') title = 'TMs Encontrados';
    else if (type === 'hms') title = 'HMs Encontrados';
    else if (type === 'itens') title = 'Itens Encontrados';

    if (!inputElement && isInitialLoad) {
        renderGuideContent(dataList, title, type, targetElement, '');
        return;
    }
    
    const filterText = inputElement ? inputElement.value.toLowerCase().trim() : '';

    const filteredList = dataList.filter(item => {
        const itemString = JSON.stringify(item).toLowerCase(); 
        return itemString.includes(filterText);
    });

    renderGuideContent(filteredList, title, type, targetElement, filterText);
}

function renderGuideContent(dataList, title, type, targetElement, filterText) {
    let html = `<h3>${title}</h3>`; 

    if (dataList.length === 0) {
        html += `<p style="color: #94a3b8; width: 100%; text-align: center;">Nenhum ${title} encontrado com o filtro "${filterText}".</p>`;
    
    } else if (type === 'tms' || type === 'hms') {
        html += `<div class="card-grid">`;
        dataList.forEach(item => {
            let typeClass = `type-${item.type ? item.type.toLowerCase() : 'normal'}`;
            
            html += `<div class="guide-card">`;
            html += `<h4 class="card-title">
                        <span class="badge ${typeClass} p-2 me-2 text-uppercase">
                            ${item.name.toUpperCase()}
                        </span> 
                        ${item.move_name.toUpperCase()}
                    </h4>`;
            html += `<p class="card-power"><strong>Tipo:</strong> <span class="type-tag ${typeClass}">${item.type ? item.type.toUpperCase() : 'NORMAL'}</span> | `;
            html += `<strong>Poder:</strong> ${item.power || '—'} | <strong>Precisão:</strong> ${item.accuracy || '—'} | <strong>PP:</strong> ${item.pp || '—'}</p>`;
            html += `<p class="card-location"><strong>Localização:</strong> ${item.location}</p>`;
            html += `</div>`;
        });
        html += `</div>`;
    } else if (type === 'itens') {
        if (filterText) {
            html += `<div class="card-grid">`;
            dataList.forEach(item => {
                html += `<div class="guide-card">`;
                html += `<span class="item-type-tag">${item.type ? item.type.toUpperCase() : 'DIVERSOS'}</span>`; 
                html += `<h4 class="card-title">${item.name.toUpperCase()}</h4>`;
                html += `<p class="card-effect"><strong>Efeito:</strong> ${item.effect}</p>`;
                html += `<p class="card-location"><strong>Localização:</strong> ${item.location}</p>`;
                html += `</div>`;
            });
            html += `</div>`;
        } else {
            const groupedItems = dataList.reduce((acc, item) => {
                const itemType = item.type || 'Diversos';
                if (!acc[itemType]) {
                    acc[itemType] = [];
                }
                acc[itemType].push(item);
                return acc;
            }, {});

            const typesOrder = ["Pokébola", "Cura", "Nutricional", "Evolução", "Batalha", "Segurar", "Berry", "Diversos", "Key Item"];
            
            const sortedTypes = Object.keys(groupedItems).sort((a, b) => {
                const indexA = typesOrder.indexOf(a);
                const indexB = typesOrder.indexOf(b);
                
                if (indexA === -1 && indexB === -1) return a.localeCompare(b);
                if (indexA === -1) return 1; 
                if (indexB === -1) return -1;
                
                return indexA - indexB;
            });
            
            sortedTypes.forEach(itemType => {
                html += `<div class="item-section my-4">`;
                html += `<h2 class="section-title mb-3 p-2 rounded"><i class="bi bi-tag-fill"></i> ${itemType.toUpperCase()}</h2>`; 
                html += `<div class="card-grid">`;
                
                groupedItems[itemType].forEach(item => {
                    html += `<div class="guide-card">`;
                    html += `<h4 class="card-title">${item.name.toUpperCase()}</h4>`;
                    html += `<p class="card-effect"><strong>Efeito:</strong> ${item.effect}</p>`;
                    html += `<p class="card-location"><strong>Localização:</strong> ${item.location}</p>`;
                    html += `</div>`;
                });
                
                html += `</div>`;
                html += `</div>`;
            });
        }
    }

    targetElement.innerHTML = html;
}

function iniciarGuia() {
    const selectedVersion = document.getElementById('gameVersionSelect').value;
    if (selectedVersion === 'firered') {
        localStorage.setItem('currentGameVersion', 'firered');
        window.location.href = 'pokemon.html';
    } else {
        alert("Esta versão está em desenvolvimento.");
    }
}


// ==========================================================
// 6. EXPOSIÇÃO GLOBAL
// ==========================================================

window.buscarPokemon = buscarPokemon;
window.limparBusca = limparBusca;
window.handleInput = handleInput;
window.carregarGuiaVersao = carregarGuiaVersao;
window.filterGuide = filterGuide;
window.searchEvolutionPokemon = searchEvolutionPokemon;
window.iniciarGuia = iniciarGuia;