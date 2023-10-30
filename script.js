const fs = require('fs');
const process = require('process');

const file = fs.readFileSync('data_memory.txt', 'utf-8');
const numeros_decimais = file.replace(/\r/g, '').split('\n');

const args = process.argv;
const argumentosPersonalizados = {};

function main() {

    for (let i = 2; i < args.length; i++) {
        const parts = args[i].split('=');
        if (parts.length === 2) {
            const nome = parts[0];
            const valor = parts[1];
            argumentosPersonalizados[nome] = valor;
        }
    }

    let enderecoSolicitado = argumentosPersonalizados.endereco;
    let tamanhoDaPagina = argumentosPersonalizados.deslocamento || 4096;
    let usaHierarquia = Boolean(argumentosPersonalizados.hierarquia);
    let arquivo = argumentosPersonalizados.arquivo;
    let listaDeEnderecos;

    listaDosEnderecosLocalizados = [];

    if (arquivo) {
        const file = fs.readFileSync(arquivo, 'utf-8');
        listaDeEnderecos = file.replace(/\r/g, '').split('\n');
    } else {
        listaDeEnderecos = [enderecoSolicitado];
    }

    for (const endereco of listaDeEnderecos) {
        if (endereco != '') {
            let eh32bits = Boolean(endereco > 65535);
            let localizado = null;
            if (usaHierarquia) {
                localizado = localizarEnderecoHierarquia(endereco, tamanhoDaPagina, eh32bits);
            } else {
                localizado = localizarEndereco(endereco, tamanhoDaPagina, eh32bits);
            }
            if (localizado) {
                listaDosEnderecosLocalizados.push(localizado);
            }
        }
    }

    if (listaDosEnderecosLocalizados.length) {
        listaDosEnderecosLocalizados.sort(function (a, b) {
            var g = parseFloat(a.enderecoSolicitado);
            var h = parseFloat(b.enderecoSolicitado);
            return g < h ? -1 : g > h;
        });

        if (listaDosEnderecosLocalizados.length === 1) {
            console.log(JSON.stringify(listaDosEnderecosLocalizados, null, 2));
        } else {
            // for (const iterator of listaDosEnderecosLocalizados) {
            //     console.log(`O endereço ${iterator.enderecoSolicitado} contém:`);
            //     console.log('número da página:', iterator.numero_paginas);
            //     console.log('deslocamento:', iterator.numero_deslocamento);
            //     console.log('valor lido:', iterator.numero);
            //     console.log('\n');
            // }
            fs.writeFileSync('resultado.json', JSON.stringify(listaDosEnderecosLocalizados, null, 2), 'utf-8');
        }
    } else {
        console.log('Conteudo nao localizado.');
    }

}

main();

function localizarEnderecoHierarquia(enderecoSolicitado, tamanhoDaPagina, eh32bits) {
    console.log('hierarquiaAtivada!');

    tamanhoDaPagina = 4096; // mantem o tamanho de 4Kb conforme solicitado

    let enderecoBinario = decimalToBinary(enderecoSolicitado).padStart(32, 0); // fixado 32bits
    let limitMaximoHierarquia = 1024;
    let numero_paginas_nivel1 = 0; // limit maximo de 1024 = 10 bits
    let numero_paginas_nivel2 = 0; // limit maximo de 1024 = 10 bits
    let numero_deslocamento = 0;

    let bitsParaDeslocamento = Math.log2(tamanhoDaPagina); // 12
    let bitsParaNiveis = 10; // conforme solicitado

    for (const numero of numeros_decimais) {
        let binarioNivel1 = decimalToBinary(numero_paginas_nivel1).padStart(bitsParaNiveis, 0);
        let binarioNivel2 = decimalToBinary(numero_paginas_nivel2).padStart(bitsParaNiveis, 0);
        let binarioDeslocamento = decimalToBinary(numero_deslocamento).padStart(bitsParaDeslocamento, 0);

        let binarioCompleto = binarioNivel1 + binarioNivel2 + binarioDeslocamento;

        if (enderecoBinario == binarioCompleto) {
            return {
                enderecoSolicitado,
                numero_paginas_nivel1,
                numero_paginas_nivel2,
                numero_deslocamento,
                valorLido: numero
            };
        }

        numero_deslocamento++;

        if (numero_deslocamento >= tamanhoDaPagina) { // 4096
            numero_deslocamento = 0;
            numero_paginas_nivel2++;
            if (numero_paginas_nivel2 >= limitMaximoHierarquia) { // 1024
                numero_paginas_nivel2 = 0;
                numero_paginas_nivel1++;
            }
        }
    }
    return false;
}

function localizarEndereco(enderecoSolicitado, tamanhoDaPagina, eh32bits) {
    let enderecoBinario = decimalToBinary(enderecoSolicitado).padStart(eh32bits ? 32 : 16, 0);

    let numero_paginas = 0;
    let numero_deslocamento = 0;
    let tratamentoBinarioDeslocamento = Math.log2(tamanhoDaPagina); // 256b 512b 1024b 2048b 4096b

    for (const numero of numeros_decimais) {
        var binario = '';
        if (eh32bits) {
            binario = decimalToBinary(numero_paginas).padStart(32 - tratamentoBinarioDeslocamento, 0);
        } else {
            binario = decimalToBinary(numero_paginas).padStart(16 - tratamentoBinarioDeslocamento, 0);
        }
        binario += decimalToBinary(numero_deslocamento).padStart(tratamentoBinarioDeslocamento, 0);

        if (enderecoBinario == binario) {
            return {
                enderecoSolicitado,
                numero_paginas,
                numero_deslocamento,
                numero
            };
        }
        numero_deslocamento++;
        if (numero_deslocamento >= tamanhoDaPagina) {
            numero_paginas++;
            numero_deslocamento = 0;
        }
    }
    return false;
}

function decimalToBinary(decimal) {
    let binary = "";
    while (decimal > 0) {
        let remainder = decimal % 2;
        binary = remainder + binary;
        decimal = Math.floor(decimal / 2);
    }
    return binary;
}
