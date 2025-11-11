// ==========================================================
// CONSTANTES GLOBAIS E VARIÁVEIS DE DADOS
// ==========================================================
const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon/';
const POKEAPI_TYPE_URL = 'https://pokeapi.co/api/v2/type/';
const POKEAPI_SPECIES_URL = 'https://pokeapi.co/api/v2/pokemon-species/';
const FIRST_GEN_LIMIT = 151; // Limite da Geração 1 (Kanto)

let pokemonNames = [];
let FIRERED_GUIDE_DATA = {};

// ==========================================================
// 1. CARREGAMENTO E DADOS INICIAIS (USANDO CAMINHO RELATIVO 'data/')
// ==========================================================

async function loadData() {
    await loadPokemonNames();
    await loadGuideData();
    // Adiciona uma chamada para carregar o guia se a URL for específica (tms.html, hms.html, itens.html)
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
        // Limitado a 251 para incluir a Geração 2, que pode ser usada em evoluções futuras
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
                throw new Error(`Falha no HTTP: Status ${response.status}`);
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
        
        FIRERED_GUIDE_DATA = { tms, hms, itens };
        console.log("Dados de TMs/HMs/Itens carregados.");
    } catch (error) {
        FIRERED_GUIDE_DATA = { tms: [], hms: [], itens: [] };
        console.warn("Aviso: Pelo menos um arquivo JSON de guia falhou ao carregar. Verifique os erros acima.");
    }
}
loadData(); 

// ==========================================================
// 2. FUNÇÕES DE BUSCA E UI
// ==========================================================

function handleInput(event) {
    if (event.key === 'Enter') {
        buscarPokemon();
    } else {
        mostrarSugestoes();
    }
}

function mostrarSugestoes() {
    const input = document.getElementById('pokemonInput').value.toLowerCase().trim();
    const suggestionsDiv = document.getElementById('suggestions');
    if (!suggestionsDiv) return;

    suggestionsDiv.innerHTML = '';
    if (input.length < 2) {
        suggestionsDiv.classList.add('hidden');
        return;
    }

    const filteredNames = pokemonNames.filter(name => name.startsWith(input)).slice(0, 10);

    if (filteredNames.length === 0) {
        suggestionsDiv.classList.add('hidden');
        return;
    }

    filteredNames.forEach(name => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        item.onclick = () => {
            document.getElementById('pokemonInput').value = name;
            suggestionsDiv.classList.add('hidden');
            buscarPokemon();
        };
        suggestionsDiv.appendChild(item);
    });

    suggestionsDiv.classList.remove('hidden');
}


function limparBusca() {
    document.getElementById('pokemonInput').value = '';
    document.getElementById('pokemonInfo').innerHTML = '<p>Use o campo acima para buscar um Pokémon.</p>';
    
    const sections = ['typeGuide', 'strategyGuide', 'evolutionChain', 'baseStats', 'movesGuide'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const suggestionsDiv = document.getElementById('suggestions');
    if (suggestionsDiv) {
        suggestionsDiv.classList.add('hidden');
        suggestionsDiv.innerHTML = '';
    }
}


async function buscarPokemon() {
    const query = document.getElementById('pokemonInput').value.toLowerCase().trim(); 
    const pokemonInfoDiv = document.getElementById('pokemonInfo');
    const typeGuideDiv = document.getElementById('typeGuide');
    const strategyGuideDiv = document.getElementById('strategyGuide');
    const evolutionChainDiv = document.getElementById('evolutionChain');
    const baseStatsDiv = document.getElementById('baseStats'); 
    const movesGuideDiv = document.getElementById('movesGuide'); 
    
    pokemonInfoDiv.innerHTML = '<p>Buscando...</p>';
    [typeGuideDiv, strategyGuideDiv, evolutionChainDiv, baseStatsDiv, movesGuideDiv].forEach(el => el.classList.add('hidden'));

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

        const speciesResponse = await fetch(`${POKEAPI_SPECIES_URL}${pokemonData.id}`);
        const speciesData = await speciesResponse.json();

        exibirBaseStats(pokemonData.stats, baseStatsDiv); 
        await buscarCadeiaEvolutiva(speciesData, evolutionChainDiv);

        await buscarGuiaDeTiposCompleto(tipos, typeGuideDiv, pokemonData.id);

        await buscarLocalizacao(pokemonData, strategyGuideDiv); 
        exibirMovimentos(pokemonData.moves, movesGuideDiv);


    } catch (error) {
        console.error('Erro geral na requisição:', error);
        pokemonInfoDiv.innerHTML = `<p style="color: #e76f51;">Ocorreu um erro de conexão ou processamento. (Verifique o console F12)</p>`;
    }
}

// --- Funções de Exibição de Conteúdo (Sem Alterações) ---

function exibirPokemon(data, targetElement, tipos) {
    const nome = data.name;
    const id = data.id;
    const imagemUrl = data.sprites.front_default;
    const shinyUrl = data.sprites.front_shiny;
    const isLegendary = [144, 145, 146, 150, 151].includes(id);

    const tipoTags = tipos.map(tipo => 
        `<span class="type-tag type-${tipo}">${tipo}</span>`
    ).join('');

    let raridade = '';
    if (isLegendary) {
        raridade = '<span style="color:#ffd166; font-weight: bold;">(LENDÁRIO/MÍTICO)</span>';
    } else if (id <= FIRST_GEN_LIMIT) {
        raridade = `(Geração 1)`;
    }

    targetElement.innerHTML = `
        <div class="pokemon-sprites">
            <div>
                <img src="${imagemUrl}" alt="${nome} normal" />
                <p style="margin: 0;">Normal</p>
            </div>
            <div>
                <img src="${shinyUrl}" alt="${nome} shiny" />
                <p class="shiny-label" style="margin: 0;">✨ Shiny</p>
            </div>
        </div>
        <h2>${nome.toUpperCase()} (#${id}) ${raridade}</h2>
        <p><strong>Tipo(s):</strong> ${tipoTags}</p>
        <p><strong>Altura:</strong> ${data.height / 10} m | <strong>Peso:</strong> ${data.weight / 10} kg</p>
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

// ==========================================================
// 3. FUNÇÕES DE EVOLUÇÃO (CORRIGIDAS)
// ==========================================================

function getEvolutionDetailsString(detail) {
    const trigger = detail.trigger.name.replace(/-/g, ' ');
    let details = trigger.charAt(0).toUpperCase() + trigger.slice(1);

    // 1. Prioridade: Se houver NÍVEL MÍNIMO, é o que deve ser exibido.
    if (detail.min_level) {
        // Envolve o nível em <strong> para destacar e facilitar a leitura.
        details = `LV <strong>${detail.min_level}</strong>`;
    } 
    // 2. Se o gatilho é Level-Up mas não tem nível (geralmente Felicidade/Stats)
    else if (trigger === 'level-up') {
         if (detail.min_happiness) {
            details = `Felicidade <strong>${detail.min_happiness}+</strong>`;
        } else if (detail.time_of_day) {
            details = `Level Up (Horário: ${detail.time_of_day})`;
        } else {
            // Level Up genérico (para evoluções como Feebas que requerem Beauty, ou outras condições)
            details = `Level Up (Condição)`; 
        }
    } 
    // 3. Outros Gatilhos (Trade, Use-Item)
    else if (trigger === 'trade') {
        details = 'Troca';
    } else if (trigger === 'use-item' && detail.item) {
        details = `Usando ${detail.item.name.replace(/-/g, ' ')}`;
    }
    
    // --- Adiciona detalhes extras (Item, Gênero, Movimento) ---
    let extraDetails = [];

    // Held Item em Trade ou Level Up
    if (detail.held_item) { 
        extraDetails.push(`Segurando ${detail.held_item.name.replace('-', ' ')}`);
    }

    if (detail.gender !== null) {
        extraDetails.push(detail.gender === 1 ? '♀ Fêmea' : '♂ Macho');
    }
    if (detail.known_move) {
         extraDetails.push(`Movimento: ${detail.known_move.name.replace('-', ' ')}`);
    }

    // Se houver detalhes extras, adiciona-os ao final
    if (extraDetails.length > 0) {
        // Verifica se 'details' já é "LV <strong>XX</strong>"
        if (details.includes('<strong>') || details.includes('Troca')) {
            details += ` + (${extraDetails.join(', ')})`;
        } else {
             // Caso não seja nível (Ex: Troca), envolve os detalhes em parênteses.
             details += ` (${extraDetails.join(', ')})`;
        }
    }
    
    return details.replace(/\s+/g, ' '); // Remove espaços extras
}

async function buscarCadeiaEvolutiva(speciesData, targetElement) {
    const chainUrl = speciesData.evolution_chain.url;
    const chainResponse = await fetch(chainUrl);
    const chainData = await chainResponse.json();

    const chain = chainData.chain;
    
    let html = '<h3>🧬 Cadeia Evolutiva (Apenas Kanto)</h3>';
    
    // Apenas renderiza se o Pokémon base estiver na Geração 1
    const currentId = parseInt(chain.species.url.split('/').slice(-2, -1)[0]);
    
    if (currentId > FIRST_GEN_LIMIT) {
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
    let html = '<div class="evolution-list-container" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 10px;">';
    
    let currentChain = chainData;
    const imageCache = {};
    
    const getPokemonImage = async (name) => {
        if (!imageCache[name]) {
            const response = await fetch(`${POKEAPI_URL}${name}`);
            if (!response.ok) return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
            const data = await response.json();
            imageCache[name] = data.sprites.front_default;
        }
        return imageCache[name];
    };
    
    // Loop para percorrer a cadeia
    while (currentChain) {
        const currentPokemonName = currentChain.species.name;
        const currentPokemonId = currentChain.species.url.split('/').slice(-2, -1)[0];
        
        // Verifica se está na Geração 1
        if (parseInt(currentPokemonId) > FIRST_GEN_LIMIT) {
            currentChain = null; // Encerra o loop se sair da Geração 1
            break;
        }

        // 1. Adicionar DETALHES do estágio ANTERIOR (se não for o estágio base)
        if (currentChain.evolution_details && currentChain.evolution_details.length > 0) {
            
            // Mapeia todos os detalhes possíveis para esta evolução (pode haver mais de um, por exemplo, nível ou pedra)
            const detailsList = currentChain.evolution_details.map(getEvolutionDetailsString);
            const detailsString = detailsList.join(' OU ');

            html += `
                <div class="evolution-details-text" style="text-align: center; margin: 0 15px; display: flex; flex-direction: column; justify-content: center; align-self: center;">
                    <p style="color: #94a3b8; font-size: 0.9em; margin: 0; font-weight: bold;">${detailsString}</p>
                    <span style="font-size: 1.5em; color: #8b5cf6;">▶</span>
                </div>
            `;
        }

        // 2. RENDERIZA O POKÉMON ATUAL
        const imageUrl = await getPokemonImage(currentPokemonName);
        html += `
            <div class="evolution-step" style="display: flex; flex-direction: column; align-items: center; margin: 10px 20px;">
                <img src="${imageUrl}" alt="${currentPokemonName}" style="width: 96px; height: 96px; ${currentPokemonName === currentSearchName ? 'border: 2px solid #8b5cf6;' : ''}" />
                <p style="margin: 5px 0;"><strong>${currentPokemonName.toUpperCase()}</strong></p>
            </div>
        `;
        
        
        // 3. Lógica para a próxima etapa (Ponto Crítico)
        if (currentChain.evolves_to.length === 1) {
            // Cadeia Linear - Avança para o próximo
            currentChain = currentChain.evolves_to[0];
        } else if (currentChain.evolves_to.length > 1) {
            // Cadeia Ramificada (Ex: Eevee)
            
            html += `<div class="ramification-details" style="text-align: center; margin: 0 15px; display: flex; flex-direction: column; justify-content: center; align-self: center; width: 100%;">
                 <p style="color: #94a3b8; font-size: 0.9em; margin: 10px 0; font-weight: bold;">EVOLUÇÕES RAMIFICADAS (VEJA ABAIXO)</p>
            </div>`;

            html += `<div class="ramification-row" style="display: flex; flex-wrap: wrap; justify-content: center; width: 100%; border-top: 1px dashed #e2e8f0; padding-top: 10px;">`;
            
            for (const nextEvo of currentChain.evolves_to) {
                   const nextId = parseInt(nextEvo.species.url.split('/').slice(-2, -1)[0]);
                   if (nextId > FIRST_GEN_LIMIT) continue; // Pula se estiver fora de Kanto
                   
                   const detailsList = nextEvo.evolution_details.map(getEvolutionDetailsString);
                   const detailsString = detailsList.join(' OU ');
                   const nextImageUrl = await getPokemonImage(nextEvo.species.name);

                   html += `
                       <div style="display: flex; flex-direction: column; align-items: center; margin: 10px 20px;">
                           <div style="text-align: center; margin-bottom: 5px; min-height: 50px;">
                               <p style="color: #94a3b8; font-size: 0.9em; font-weight: bold; max-width: 120px; line-height: 1.2;">${detailsString}</p>
                               <span style="font-size: 1.5em; color: #8b5cf6;">⬇️</span>
                           </div>
                           <div class="evolution-step">
                               <img src="${nextImageUrl}" alt="${nextEvo.species.name}" style="width: 96px; height: 96px;" />
                               <p style="margin: 3px 0; font-size: 1em;"><strong>${nextEvo.species.name.toUpperCase()}</strong></p>
                           </div>
                       </div>
                   `;
            }
            html += `</div>`; 

            currentChain = null; // Termina o loop após ramificação
            
        } else {
             currentChain = null; // Fim da cadeia
        }
    }

    
    html += '</div>';
    return html;
}


// ==========================================================
// 4. GUIAS (Tabela de Vantagens/Desvantagens, Localização, Movimentos) - Sem Alterações
// ==========================================================

async function buscarGuiaDeTiposCompleto(tipos, targetElement, pokemonId) {
    if (tipos.length === 0) return;

    const DAMAGE_MULTIPLIERS = {
        'double_damage_from': 2,
        'half_damage_from': 0.5,
        'no_damage_from': 0
    };

    let defenseRelations = {
        '4x': { title: 'Dano Quádruplo', types: [] },
        '2x': { title: 'Dano Dobrado (Fraqueza)', types: [] },
        '0.5x': { title: 'Dano Reduzido (Resistência)', types: [] },
        '0.25x': { title: 'Dano Mínimo', types: [] },
        '0x': { title: 'Imunidade', types: [] }
    };
    
    let attackRelations = {
        '2x': { title: 'Super Efetivo', types: [] },
        '0.5x': { title: 'Não Muito Efetivo', types: [] },
        '0x': { title: 'Sem Efeito (Imune)', types: [] }
    };


    let tempDefenseRelations = { 'double_damage_from': {}, 'half_damage_from': {}, 'no_damage_from': {} };

    for (const tipo of tipos) {
        const response = await fetch(`${POKEAPI_TYPE_URL}${tipo}`);
        const data = await response.json();
        
        for (const relation in DAMAGE_MULTIPLIERS) {
            data.damage_relations[relation].forEach(damageType => {
                const typeName = damageType.name;
                tempDefenseRelations[relation][typeName] = (tempDefenseRelations[relation][typeName] || 0) + 1;
            });
        }
    }

    const finalDefenseRelations = {}; 
    for (const typeName in tempDefenseRelations.double_damage_from) {
        finalDefenseRelations[typeName] = (finalDefenseRelations[typeName] || 1) * 2;
    }
    for (const typeName in tempDefenseRelations.half_damage_from) {
        finalDefenseRelations[typeName] = (finalDefenseRelations[typeName] || 1) * 0.5;
    }
    for (const typeName in tempDefenseRelations.no_damage_from) {
        finalDefenseRelations[typeName] = 0; 
    }

    const allTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'steel', 'dark', 'fairy'];
    
    for (const typeName of allTypes) {
        const factor = finalDefenseRelations[typeName] || 1; 
        const tag = `<span class="type-tag type-${typeName}">${typeName.toUpperCase()}</span>`;
        
        if (factor === 4) defenseRelations['4x'].types.push(tag);
        else if (factor === 2) defenseRelations['2x'].types.push(tag);
        else if (factor === 0.5) defenseRelations['0.5x'].types.push(tag);
        else if (factor === 0.25) defenseRelations['0.25x'].types.push(tag);
        else if (factor === 0) defenseRelations['0x'].types.push(tag);
    }
    
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

    html += '<div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-top: 20px;">';
    html += '<h4>⬇️ DANO RECEBIDO (DEFESA)</h4>';
    html += '<p>O multiplicador de dano que <strong>este Pokémon sofre</strong>.</p>';

    for (const key in defenseRelations) {
        const group = defenseRelations[key];
        
        if (group.types.length > 0) {
            let color;
            if (key === '4x' || key === '2x') color = '#F44336'; 
            else if (key === '0x') color = '#4CAF50'; 
            else color = '#2196F3'; 
            
            html += `
                <h5 style="color: ${color}; margin-top: 10px; margin-bottom: 5px; border-bottom: 1px dotted #334155; padding-bottom: 5px;">
                    ${group.title} (${key})
                </h5>
                <div>${group.types.join(' ')}</div>
            `;
        }
    }
    html += '</div>'; 

    html += '<div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-top: 20px;">';
    html += '<h4>⬆️ DANO CAUSADO (ATAQUE)</h4>';
    html += '<p>O dano que <strong>este Pokémon causa</strong> (com movimentos do seu próprio tipo).</p>';

    for (const key in uniqueAttackRelations) {
        const group = uniqueAttackRelations[key];
        
        if (group.length > 0) {
            let color;
            if (key === '2x') color = '#4CAF50'; 
            else if (key === '0x') color = '#F44336'; 
            else color = '#FFEB3B'; 
            
            const title = key === '2x' ? 'Super Efetivo' : (key === '0.5x' ? 'Não Muito Efetivo' : 'Sem Efeito (Imune)');

            html += `
                <h5 style="color: ${color}; margin-top: 10px; margin-bottom: 5px; border-bottom: 1px dotted #334155; padding-bottom: 5px;">
                    ${title} (${key})
                </h5>
                <div>${group.join(' ')}</div>
            `;
        }
    }
    html += '</div>'; 
    
    targetElement.innerHTML = html;
    targetElement.classList.remove('hidden');
}


async function buscarLocalizacao(pokemonData, targetElement) {
    const locationResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonData.id}/encounters`);
    const locationData = await locationResponse.json();

    const FIRERED_NAME = 'firered';

    let html = '<h4>Encontros em Kanto (FireRed):</h4>';
    let locationsFound = false;

    for (const location of locationData) {
        for (const area of location.version_details) {
            if (area.version.name === FIRERED_NAME) {
                const locationName = location.location_area.name.replace(/-/g, ' ').toUpperCase();
                
                area.encounter_details.forEach(detail => {
                    const method = detail.method.name.replace(/-/g, ' ');
                    const minLevel = detail.min_level;
                    const maxLevel = detail.max_level;

                    html += `
                        <div class="item-card" style="padding: 10px; margin-bottom: 8px;">
                            <strong>📍 ${locationName}</strong>
                            <p style="margin: 0;">Método: ${method.charAt(0).toUpperCase() + method.slice(1)} | Nível: ${minLevel}-${maxLevel}</p>
                        </div>
                    `;
                    locationsFound = true;
                });
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
            const learnMethod = fireRedDetails.move_learn_method.name;
            const moveName = moveEntry.move.name.replace(/-/g, ' ').toUpperCase();
            
            if (learnMethod === 'level-up') {
                movesByLevel.push({
                    name: moveName,
                    level: fireRedDetails.level_learned_at
                });
            } else if (learnMethod === 'machine') {
                movesByMachine.push({
                    name: moveName,
                });
            }
        }
    });

    movesByLevel.sort((a, b) => a.level - b.level);
    
    let htmlContent = '';

    htmlContent += `<h4>⬆️ Aprende por Level Up:</h4>`;
    if (movesByLevel.length > 0) {
        htmlContent += `
            <ul style="list-style-type: none; padding-left: 0;">
                ${movesByLevel.map(move => 
                    `<li style="margin-bottom: 5px;"><strong>Nível ${move.level}:</strong> ${move.name}</li>`
                ).join('')}
            </ul>
        `;
    } else {
        htmlContent += `<p>Não aprende movimentos por nível em FireRed/LeafGreen.</p>`;
    }

    const uniqueMachineMoves = [...new Set(movesByMachine.map(m => m.name))].sort();
    
    htmlContent += `<h4>💾 Aprende por Máquina (TM/HM):</h4>`;
    if (uniqueMachineMoves.length > 0) {
        htmlContent += `
            <div style="column-count: 2; text-align: left; font-size: 0.9em; margin-top: 10px;">
                ${uniqueMachineMoves.map(name => `<span>• <strong>${name}</strong></span>`).join('<br>')}
            </div>
        `;
    } else {
        htmlContent += `<p>Não pode aprender movimentos via TM/HM.</p>`;
    }

    targetElement.innerHTML = htmlContent;
    targetElement.classList.remove('hidden');
}


function carregarGuiaVersao(type) {
    if (FIRERED_GUIDE_DATA[type] === undefined) {
        document.getElementById('versionGuideContent').innerHTML = '<p style="color: #e76f51;">Erro: Dados não carregados. Verifique o console para a falha do JSON.</p>';
        return;
    }
    
    filterGuide(type);
}

function filterGuide(type) {
    const targetElement = document.getElementById('versionGuideContent');
    const searchInput = document.getElementById(`${type}SearchInput`);
    
    const filterText = searchInput ? searchInput.value.toLowerCase() : ''; 

    const dataList = FIRERED_GUIDE_DATA[type] || [];
    let title = '';

    if (type === 'tms') title = 'TMs (Technical Machines)';
    else if (type === 'hms') title = 'HMs (Hidden Machines)';
    else if (type === 'itens') title = 'Itens Chave e Consumíveis';

    const filteredList = dataList.filter(item => {
        const itemString = JSON.stringify(item).toLowerCase(); 
        return itemString.includes(filterText);
    });

    let html = `<h3>${title}</h3><div class="card-grid">`; 

    if (filteredList.length > 0) {
        filteredList.forEach(item => {
            
            let typeClass = '';
            
            if (type === 'tms' || type === 'hms') {
                typeClass = `type-${item.type ? item.type.toLowerCase() : 'normal'}`; 
            }

            html += `<div class="guide-card">`; 
            
           if (type === 'tms' || type === 'hms') {
             const code = item.code ? item.code.toUpperCase() : (type === 'tms' ? 'TM' : 'HM');
             const moveName = item.move ? item.move.replace(/-/g, ' ').toUpperCase() : '—';
             
             html += `<h4 class="card-title">${code} - ${moveName}</h4>`;
             
             html += `<p class="card-move"><strong>Movimento:</strong> <span style="color: #8b5cf6;">${moveName}</span></p>`;
             
             if (type === 'tms') {
                 html += `<p><strong>Tipo:</strong> <span class="type-tag type-${item.type?.toLowerCase() || 'normal'}">${item.type?.toUpperCase() || 'NORMAL'}</span> | <strong>Poder:</strong> ${item.power || 'Status'}</p>`;
             }

             html += `<p class="card-effect"><strong>Efeito:</strong> ${item.effect}</p>`;
         }
         else { 
               html += `<h4 class="card-title">${item.name.toUpperCase()}</h4>`;
               html += `<p class="card-effect"><strong>Efeito:</strong> ${item.effect}</p>`;
            }
            
            html += `<p class="card-location"><strong>Localização:</strong> ${item.location}</p>`;
            html += `</div>`;
        });
    } else {
        html += `<p style="color: #94a3b8; width: 100%; text-align: center;">Nenhum ${title} encontrado com o filtro "${filterText}".</p>`;
    }

    html += `</div>`; 
    
    targetElement.innerHTML = html;
}

// ==========================================================
// 5. EXPOSIÇÃO GLOBAL (Sem Alterações)
// ==========================================================

window.buscarPokemon = buscarPokemon;
window.limparBusca = limparBusca; 
window.handleInput = handleInput; 
window.mostrarSugestoes = mostrarSugestoes;
window.carregarGuiaVersao = carregarGuiaVersao;
window.filterGuide = filterGuide;

// Função para a tela inicial (se aplicável no seu projeto)
function iniciarGuia() {
    const selectedVersion = document.getElementById('gameVersionSelect').value;
    if (selectedVersion === 'firered') {
        localStorage.setItem('currentGameVersion', 'firered');
        window.location.href = 'pokemon.html';
    } else {
        alert("Esta versão está em desenvolvimento.");
    }
}
window.iniciarGuia = iniciarGuia;