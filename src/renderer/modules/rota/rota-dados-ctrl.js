// rota-dados-ctrl.js
// Este arquivo contém o script de controle da tela rota-dados-view. O mesmo
// apresenta os dados de uma determinada rota cadastrada. Também é feito uma busca nas
// base de dados de alunos e escolas para conhecer o quantitativo atendido por rota
// e o traçado da rotas.

var idRota = estadoRota["ID"];
var listaDeAlunos = new Map();
var listaDeEscolas = new Map();

// Variáveis de Mapas
var geojson = new ol.format.GeoJSON();
var temMapa = false;
var mapMalhas = {};
var mapa = novoMapaOpenLayers("mapDetalheRota", cidadeLatitude, cidadeLongitude);

// Malha
var malha = mapa["addLayer"]("Malha");
var malhaSource = malha["source"];
var malhaLayer = malha["layer"];

// Ativa busca e camadas
mapa["activateGeocoder"]();
mapa["activateImageLayerSwitcher"]();

var estilos = {}
estilos["Pavimentada"] = new ol.style.Stroke({ color: "#00cca7", width: 4 })
estilos["NaoPavimentada"] = new ol.style.Stroke({ color: '#ff6f00', width: 4 })
estilos["Hidrovia"] = new ol.style.Stroke({ color: "#1ebafc", width: 4 })

var modoSelecionado = "Pavimentada";

var estilosIcones = {
    inicio: "img/icones/inicio-icone.png",
    mataburro: "img/icones/mataburro-marcador.png",
    colchete: "img/icones/porteira-marcador.png"
}

var gerarMarcadorIcone = (imgPath) => {
    return new ol.style.Icon({
        anchor: [16, 16],
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels',
        opacity: 1,
        src: imgPath
    })
}

var getGeomStyle = function (feature) {
    var tipoLinha = feature.get("estilo");
    if (tipoLinha == undefined) {
        tipoLinha = "Pavimentada";
    }
    var styles = new Array();

    if (feature.getGeometry() instanceof ol.geom.LineString) {
        styles.push(new ol.style.Style({
            stroke: estilos[tipoLinha]
        }));

        let pontoReferencial = null;
        let ultPonto = feature.getGeometry().getLastCoordinate().slice(0, 2);
        feature.getGeometry().forEachSegment(function (start, end) {
            let plotSeta = false;

            if (!pontoReferencial) {
                plotSeta = true;
                pontoReferencial = ol.proj.transform(start, 'EPSG:3857', 'EPSG:4326');
                return;
            } else if ((start[0] == ultPonto[0] && start[1] == ultPonto[1]) ||
                (end[0] == ultPonto[0] && end[1] == ultPonto[1])) {
                plotSeta = true;
            } else {
                let pontoAtual = ol.proj.transform(end, 'EPSG:3857', 'EPSG:4326');

                let distancia = ol.sphere.getDistance(pontoReferencial, pontoAtual);

                if (distancia > 2000) {
                    pontoReferencial = pontoAtual;
                    plotSeta = true;
                }
            }

            if (plotSeta) {
                var dx = end[0] - start[0];
                var dy = end[1] - start[1];
                var rotation = Math.atan2(dy, dx);

                // arrows
                styles.push(new ol.style.Style({
                    geometry: new ol.geom.Point(end),
                    image: new ol.style.Icon({
                        src: 'img/icones/arrow.png',
                        anchor: [0.75, 0.5],
                        rotateWithView: true,
                        rotation: -rotation
                    })
                }));
            }

        });
    }
    return styles;
}

malhaLayer.setStyle((feature) => {
    if (feature.getGeometry() instanceof ol.geom.LineString) {
        feature.setStyle(getGeomStyle(feature));
    } else if (feature.getGeometry() instanceof ol.geom.Point) {
        var tipoIcone = feature.get("estiloIcone");
        feature.setStyle(new ol.style.Style({
            image: gerarMarcadorIcone(estilosIcones[tipoIcone])
        }))
    }
})


// Plot
var plotarMarcadorNumerico = (alunoRaw, num, nomes) => {
    let lat = alunoRaw["LOC_LATITUDE"];
    let lng = alunoRaw["LOC_LONGITUDE"];

    let p = gerarMarcadorNumerico(lat, lng, num, tamanho_fonte = 0.6);

    p.setId(alunoRaw["ID_ALUNO"]);
    p.set("ID", alunoRaw["ID_ALUNO"]);
    p.set("Alunos", nomes.join("<br>"));
    p.set("TIPO", "ALUNO_NUMERICO")
    malhaSource.addFeature(p);
}

// Select para lidar com click no aluno
var selectNumerico = selectPonto("ALUNO_NUMERICO");

// Popup aluno
mapa["map"].addInteraction(selectNumerico);
var popupAlunoNumerico = new ol.Overlay.PopupFeature({
    popupClass: "default anim",
    select: selectNumerico,
    closeBox: true,
    template: {
        title: (elem) => {
            return "Aluno";
        },
        attributes: {
            'Alunos': {
                title: 'Alunos'
            },
        }
    }
});
// Adiciona no mapa
mapa["map"].addOverlay(popupAlunoNumerico);


var plotarEscola = (escolaRaw) => {
    let lat = escolaRaw["LOC_LATITUDE"];
    let lng = escolaRaw["LOC_LONGITUDE"];
    let icon = "img/icones/escola-marker.png";

    let marcador = gerarMarcador(lat, lng, icon);
    marcador.set("nome", escolaRaw["NOME"]);
    marcador.set("content", escolaRaw["NOME"]);
    malhaSource.addFeature(marcador);
}

// Plota garagem na tela
var plotarGaragem = (garagemRaw) => {
    let lat = garagemRaw["LOC_LATITUDE"];
    let lng = garagemRaw["LOC_LONGITUDE"];
    let icon = "img/icones/garagem-icone.png";

    let marcador = gerarMarcador(lat, lng, icon);
    marcador.set("nome", "GARAGEM");
    marcador.set("content", "GARAGEM");
    malhaSource.addFeature(marcador);
}

// Tira o btn group do datatable
$.fn.dataTable.Buttons.defaults.dom.container.className = 'dt-buttons';

var configTable = {
    columns: [
        { width: "20%", className: "text-right detalheChave" },
        { width: "60%", className: "text-left detalheValor" },
    ],
    autoWidth: false,
    paging: false,
    searching: false,
    ordering: false,
    dom: 't<"detalheToolBar"B>',
    buttons: [
        {
            text: "Voltar",
            className: "btn-info",
            action: function (e, dt, node, config) {
                navigateDashboard(lastPage);
            }
        },
        {
            extend: 'excel',
            className: 'btnExcel',
            filename: "Rota" + estadoRota["NOME"],
            title: appTitle,
            messageTop: "Dados da Rota: " + estadoRota["NOME"],
            text: 'Exportar para Excel/LibreOffice',
            customize: function (xlsx) {
                var sheet = xlsx.xl.worksheets['sheet1.xml'];

                $('row c[r^="A"]', sheet).attr('s', '2');
                $('row[r="1"] c[r^="A"]', sheet).attr('s', '27');
                $('row[r="2"] c[r^="A"]', sheet).attr('s', '3');
            }
        },
        {
            extend: 'pdfHtml5',
            orientation: "landscape",
            title: "Rota",
            text: "Exportar para PDF",
            exportOptions: {
                columns: [0, 1]
            },
            customize: function (doc) {
                doc = docReport(doc);
                doc.content[3].table.widths = ['30%', '70%'];
                doc.content[2].text = "Dados da Rota: " + estadoRota["NOME"];

                // Adiciona mapa se tiver
                if (temMapa) {
                    doc.content.push({
                        "text": "Mapa",
                        "style": "tituloMapa",
                        "pageBreak": "before"
                    });
                    doc.content.push({
                        image: exportarParaPNG(mapa["map"]).toDataURL(),
                        width: 500,
                        alignment: "center",
                        margin: [0, 20],
                    });
                }
            }
        },
        {
            text: "Modificar",
            className: "btnMoficar",
            action: function (e, dt, node, config) {
                action = "editarRota";
                navigateDashboard("./modules/rota/rota-cadastrar-view.html");
            }
        },
        {
            text: "Apagar",
            className: "btnApagar",
            action: function (e, dt, node, config) {
                action = "apagarRota";
                criarModalConfirmacaoAcao("Remover essa rota?",
                    "Ao remover essa rota ela será retirado do sistema e os alunos e "
                    + "escolas que possuir vínculo deverão ser rearranjadas novamente."
                ).then((res) => {
                    let listaPromisePraRemover = []
                    if (res.value) {
                        listaPromisePraRemover.push(restImpl.dbDELETE(DB_TABLE_ROTA, `/${idRota}`));
                    }

                    return Promise.all(listaPromisePraRemover)
                }).then((res) => {
                    if (res.length > 0) {
                        Swal2.fire({
                            title: "Sucesso!",
                            icon: "success",
                            text: "Rota removida com sucesso!",
                            confirmButtonText: 'Retornar a página de administração'
                        });
                    }
                }).catch((err) => {
                    errorFn("Erro ao remover a rota", err)
                })
            }
        },
    ]
}

// Cria DataTables
var dataTableRota = $("#dataTableDadosRota").DataTable(configTable);

var dataTableListaDeEscolas = $("#dataTableListaDeEscolas").DataTable({
    columns: [
        { data: 'NOME', width: "40%" },
        { data: 'LOCALIZACAO', width: "15%" },
        { data: 'ENSINO', width: "15%" },
        { data: 'HORARIO', width: "30%" }
    ],
    columnDefs: [{ targets: 0, render: renderAtMostXCharacters(50) }],
    autoWidth: false,
    bAutoWidth: false,
    lengthMenu: [[10, 50, -1], [10, 50, "Todas"]],
    pagingType: "full_numbers",
    order: [[0, "asc"]],
    language: {
        "search": "_INPUT_",
        "searchPlaceholder": "Procurar escolas",
        "lengthMenu": "Mostrar _MENU_ escolas por página",
        "zeroRecords": "Não encontrei nenhuma escola cadastrada",
        "info": "Mostrando página _PAGE_ de _PAGES_",
        "infoEmpty": "Sem registros disponíveis",
        "infoFiltered": "(Escolas filtradas a partir do total de _MAX_ escolas)",
        "paginate": {
            "first": "Primeira",
            "last": "Última",
            "next": "Próxima",
            "previous": "Anterior"
        },
    },
    dom: 'frtip',
});

var dataTableListaDeAlunos = $("#dataTableListaDeAlunos").DataTable({
    columns: [
        { data: 'NOME', width: "45%" },
        { data: 'LOCALIZACAO', width: "25%" },
        { data: 'NIVELSTR', width: "20%" },
        { data: 'TURNOSTR', width: "20%" },
    ],
    columnDefs: [{ targets: 0, render: renderAtMostXCharacters(50) }],
    autoWidth: false,
    bAutoWidth: false,
    buttons: [
        {
            extend: 'excel',
            className: 'btnExcel',
            filename: "Rota" + estadoRota["NOME"],
            title: appTitle,
            messageTop: "Dados da Rota: " + estadoRota["NOME"],
            text: 'Exportar para Excel/LibreOffice',
            customize: function (xlsx) {
                var sheet = xlsx.xl.worksheets['sheet1.xml'];

                $('row c[r^="A"]', sheet).attr('s', '2');
                $('row[r="1"] c[r^="A"]', sheet).attr('s', '27');
                $('row[r="2"] c[r^="A"]', sheet).attr('s', '3');
            }
        },
        {
            extend: 'pdfHtml5',
            orientation: "landscape",
            title: "Rota",
            text: "Exportar para PDF",
            exportOptions: {
                columns: [0, 1, 2, 3]
            },
            customize: function (doc) {
                doc = docReport(doc);
                doc.content[3].table.widths = ['45%', '25%', '20%', '20%'];
            }
        },
    ],
    lengthMenu: [[10, 50, -1], [10, 50, "Todas"]],
    pagingType: "full_numbers",
    order: [[0, "asc"]],
    language: {
        "search": "_INPUT_",
        "searchPlaceholder": "Procurar alunos",
        "lengthMenu": "Mostrar _MENU_ alunos por página",
        "zeroRecords": "Não encontrei nenhum aluno cadastrado",
        "info": "Mostrando página _PAGE_ de _PAGES_",
        "infoEmpty": "Sem registros disponíveis",
        "infoFiltered": "(Alunos filtrados a partir do total de _MAX_ alunos)",
        "paginate": {
            "first": "Primeira",
            "last": "Última",
            "next": "Próxima",
            "previous": "Anterior"
        },
    },
    dom: 'frtipB',
});

var dataTableListaDeAlunosNumerada = $("#dataTableListaDeAlunosNumerada").DataTable({
    columns: [
        { data: 'NUM', width: "15%" },
        { data: 'NOME', width: "25%" },
        { data: 'LOCALIZACAO', width: "15%" },
        { data: 'NIVELSTR', width: "150px" },
        { data: 'TURNOSTR', width: "150px" },
    ],
    columnDefs: [{ targets: 0, type: "num" },
    { targets: 1, render: renderAtMostXCharacters(50) }],
    autoWidth: false,
    bAutoWidth: false,
    buttons: [
        {
            extend: 'excel',
            className: 'btnExcel',
            filename: "Rota" + estadoRota["NOME"],
            title: appTitle,
            messageTop: "Dados da Rota: " + estadoRota["NOME"],
            text: 'Exportar para Excel/LibreOffice',
            customize: function (xlsx) {
                var sheet = xlsx.xl.worksheets['sheet1.xml'];

                $('row c[r^="A"]', sheet).attr('s', '2');
                $('row[r="1"] c[r^="A"]', sheet).attr('s', '27');
                $('row[r="2"] c[r^="A"]', sheet).attr('s', '3');
            }
        },
        {
            extend: 'pdfHtml5',
            orientation: "landscape",
            title: "Rota",
            text: "Exportar para PDF",
            exportOptions: {
                columns: [0, 1, 2, 3, 4]
            },
            customize: function (doc) {
                doc.content[1].table.widths = ['10%', '45%', '20%', '15%', '10%'];
                doc = docReport(doc);

                // O datatable coloca o select dentro do header, vamos tirar isso
                for (col of doc.content[3].table.body[0]) {
                    col.text = col.text.split("    ")[0];
                }

                doc.content[2].text = listaDeRotas?.size + " " + doc.content[2].text;
                doc.styles.tableHeader.fontSize = 12;

                // Adiciona mapa se tiver
                if (temMapa) {
                    doc.content.push({
                        "text": "Mapa",
                        "style": "tituloMapa",
                        "pageBreak": "before"
                    });
                    doc.content.push({
                        image: exportarParaPNG(mapa["map"]).toDataURL(),
                        width: 500,
                        alignment: "center",
                        margin: [0, 20],
                    });
                }
            }
        },
    ],
    lengthMenu: [[10, 50, -1], [10, 50, "Todas"]],
    pagingType: "full_numbers",
    order: [[0, "asc"]],
    language: {
        "search": "_INPUT_",
        "searchPlaceholder": "Procurar alunos",
        "lengthMenu": "Mostrar _MENU_ alunos por página",
        "zeroRecords": "Não encontrei nenhum aluno cadastrado",
        "info": "Mostrando página _PAGE_ de _PAGES_",
        "infoEmpty": "Sem registros disponíveis",
        "infoFiltered": "(Alunos filtrados a partir do total de _MAX_ alunos)",
        "paginate": {
            "first": "Primeira",
            "last": "Última",
            "next": "Próxima",
            "previous": "Anterior"
        },
    },
    dom: 'frtipB',
});

estadoRota["ALUNOS"].forEach(aluno => {
    listaDeAlunos.set(aluno["ID_ALUNO"], aluno)
})

estadoRota["ESCOLAS"].forEach(escola => {
    listaDeEscolas.set(escola["ID_ESCOLA"], escola)
})

restImpl.dbGETEntidade(DB_TABLE_ROTA, `/${estadoRota.ID}`)
    .then((rotaRaw) => {
        criarModalLoading("Carregando...")

        let detalhesDaRota = parseRotaDBREST(rotaRaw);
        Object.assign(estadoRota, detalhesDaRota);
        return detalhesDaRota;
    })
    .then(() => pegarShapeRota())
    .then(() => pegarAlunosEscolasRota())
    .then(() => pegarVeiculoRota())
    .then(() => adicionarDadosRotaTabela())
    .then(async () => await adicionarDadosAlunoEscolaTabelaEMapa())
    .then(async () => {
        // Carrega mapa para impressão
        $("#detalheMapa").trigger("click");
        await mapa["map"].updateSize();
        await new Promise(r => setTimeout(r, 500));
        
        $("#tab-dados-localizacao").removeClass("active");
        $("#detalheInitBtn").trigger("click");    
        Swal2.close()
    })
    .catch((err) => {
        console.log(err)
    })

// TODO
// Por algum motivo o tab de mapa aparece nas outras abas
// Vamos forçar remover quando for diferente
function esconderTabMapa() {
    $("#tab-dados-localizacao").removeClass("active");
}

$("#detalheInitBtn, #detalheEscolas, #detalheAlunos").each((idx, tab) => {
    $(tab).on('click', esconderTabMapa);
})

// Processa garagem
var processarGaragem = (res) => {
    for (let garagemRaw of res) {
        if (garagemRaw["LOC_LONGITUDE"] != null && garagemRaw["LOC_LONGITUDE"] != undefined &&
            garagemRaw["LOC_LATITUDE"] != null && garagemRaw["LOC_LATITUDE"] != undefined) {
            plotarGaragem(garagemRaw)
        }
    }
}

async function pegarShapeRota() {
    let temShape = false;
    let shapeDaRota;
    try {
        shapeDaRota = await restImpl.dbGETEntidade(DB_TABLE_ROTA, `/${estadoRota.ID}/shape`);
        temShape = true;
    } catch (error) {
        temShape = false;
    } finally {
        if (temShape) {
            estadoRota["SHAPE"] = JSON.parse(shapeDaRota?.data?.shape);
        }
    }
}

async function pegarVeiculoRota() {
    try {
        // TODO: Mudar esse código
        let todosVeiculosReq = await restImpl.dbGETColecao(DB_TABLE_VEICULO);
        let veiculoRotaReq = await restImpl.dbGETEntidade(DB_TABLE_ROTA, `/${idRota}/veiculos`);
        let v = veiculoRotaReq.data;

        let veiculoEspecifico = todosVeiculosReq.filter(a => Number(a.id_veiculo) == Number(v.id_veiculo))[0]
        estadoRota["VEICULO_ROTA"] = `${veiculoEspecifico.tipo} (${veiculoEspecifico.placa})`
    } catch (erro) {
        estadoRota["VEICULO_ROTA"] = "Não informado"
    }
}

async function pegarAlunosEscolasRota() {
    try {
        let alunos = await restImpl.dbGETColecao(DB_TABLE_ROTA, `/${estadoRota.ID}/alunos`);
        // TODO: Deveria retornar todos os dados dos alunos
        for (let alunoRaw of alunos) {
            let idAluno = alunoRaw.id_aluno;
            let alunoJSON;
            try {
                let alunosDados = await restImpl.dbGETEntidade(DB_TABLE_ALUNO, `/${idAluno}`);
                alunoJSON = parseAlunoREST(alunosDados);
            } catch (err) {
                alunoJSON = parseAlunoREST(alunoRaw);
            }
            listaDeAlunos.set(alunoJSON["ID"], alunoJSON);
        }
    } catch (error) {
        listaDeAlunos = new Map();
    }

    try {
        let escolas = await restImpl.dbGETColecao(DB_TABLE_ROTA, `/${estadoRota.ID}/escolas`);

        for (let escolaRaw of escolas) {
            let escolaJSON = parseEscolaREST(escolaRaw);
            listaDeEscolas.set(escolaJSON["ID"], escolaJSON);
        }
    } catch (error) {
        listaDeEscolas = new Map();
    }
}

function adicionarDadosRotaTabela() {
    // Popular tabela utilizando rota escolhida
    $("#detalheNomeRota").html(estadoRota["NOME"]);
    dataTableRota.row.add(["Nome da rota", estadoRota["NOME"]]);

    var tipoRota = "";
    switch (estadoRota["TIPO"]) {
        case 1: tipoRota = "Rodoviária"; break;
        case 2: tipoRota = "Aquaviária"; break;
        case 3: tipoRota = "Mista"; break;
        default: tipoRota = "Rodoviária";
    }
    dataTableRota.row.add(["Tipo", tipoRota]);
    dataTableRota.row.add(["Veículo", estadoRota["VEICULO_ROTA"]]);

    var dificuldadesAcesso = new Array();
    if (estadoRota["DA_PORTEIRA"] != "") { dificuldadesAcesso.push("Porteira"); }
    if (estadoRota["DA_MATABURRO"] != "") { dificuldadesAcesso.push("Mata-Burro"); }
    if (estadoRota["DA_COLCHETE"] != "") { dificuldadesAcesso.push("Colchete"); }
    if (estadoRota["DA_ATOLEIRO"] != "") { dificuldadesAcesso.push("Atoleiro"); }
    if (estadoRota["DA_PONTERUSTICA"] != "") { dificuldadesAcesso.push("Ponte Rústica"); }

    if (dificuldadesAcesso.length != 0) {
        dataTableRota.row.add(["Dificuldade de acesso", dificuldadesAcesso.join(", ")]);
    } else {
        dataTableRota.row.add(["Dificuldade de acesso", "Nenhuma"]);
    }

    dataTableRota.row.add(["Número de <br />alunos atendidos", listaDeAlunos.size]);
    dataTableRota.row.add(["Número de <br />escolas atendidas", listaDeEscolas.size]);

    if (estadoRota["KM"] != "") {
        dataTableRota.row.add(["Quilometragem da Rota", estadoRota["KM"] + " km"]);
    } else {
        dataTableRota.row.add(["Quilometragem da Rota", "Não informada"]);
    }

    if (estadoRota["TEMPO"] != "") {
        dataTableRota.row.add(["Duração da Rota", estadoRota["TEMPO"] + " min"]);
    } else {
        dataTableRota.row.add(["Duração da Rota", "Não informada"]);
    }
    dataTableRota.draw();
}

// Adiciona dados de alunos e escola nas respectivas tabelas e mapa
async function adicionarDadosAlunoEscolaTabelaEMapa() {
    // Acrescentando rota existente
    if (estadoRota["SHAPE"] != "" && estadoRota["SHAPE"] != null && estadoRota["SHAPE"] != undefined) {
        $("#avisoNaoGeoReferenciada").hide();
        malhaSource.addFeatures((new ol.format.GeoJSON()).readFeatures(estadoRota["SHAPE"]));
        temMapa = true;
    } else {
        $("#mapDetalheRota").hide();
        $("#dataTableListaDeAlunosNumerada").hide();
    }

    if (estadoRota["SHAPE"] != "" && estadoRota["SHAPE"] != null && estadoRota["SHAPE"] != undefined) {
        try {
            // let rotaGeoJson = (new ol.format.GeoJSON()).readFeatures(estadoRota["SHAPE"]);
            // rotaGeoJson[0].getGeometry().flatCoordinates[1]
            let primeiro_ponto = estadoRota["SHAPE"].features[0].geometry.coordinates[0];

            let novaListaDeAlunos = [...listaDeAlunos.values()];
            let alunosComGPS = novaListaDeAlunos.filter(aluno => (aluno["LOC_LONGITUDE"] != null && aluno["LOC_LONGITUDE"] != undefined &&
                aluno["LOC_LATITUDE"] != null && aluno["LOC_LATITUDE"] != undefined &&
                aluno["LOC_LATITUDE"] != "" && aluno["LOC_LONGITUDE"] != ""))

            alunosComGPS.forEach(aluno => {
                aluno["COORD"] = [aluno.LOC_LONGITUDE, aluno.LOC_LATITUDE]
            })

            // let ponto_atual = [primeiro_ponto[0], primeiro_ponto[1]];
            let ponto_atual = ol.proj.transform([primeiro_ponto[0], primeiro_ponto[1]], "EPSG:3857", "EPSG:4326")
            let num = 1;
            while (alunosComGPS.length != 0) {
                alunosComGPS.sort((a, b) => {
                    let adist = ol.sphere.getDistance(ponto_atual, a["COORD"]);
                    let bdist = ol.sphere.getDistance(ponto_atual, b["COORD"]);

                    return adist - bdist;
                })

                // Pega o aluno mais próximo do ponto atual da rota
                let aluno_original = alunosComGPS.shift();
                let nome_alunos = ["⚫ " + aluno_original.NOME];

                // Salva o número/ID do aluno
                let num_original = num;
                aluno_original["NUM"] = num;

                // Adiciona na tabela
                dataTableListaDeAlunos.row.add(aluno_original);
                dataTableListaDeAlunosNumerada.row.add(aluno_original);

                // Aluno vira o próximo ponto
                ponto_atual = aluno_original["COORD"];
                num++;

                // Veja se tem outros alunos próximos, se sim, coloque todos juntos nesse local
                if (alunosComGPS.length > 0) {
                    let dist = ol.sphere.getDistance(ponto_atual, alunosComGPS[0].COORD);
                    while (dist < 500 && alunosComGPS.length > 0) {
                        let prox_aluno = alunosComGPS.shift();
                        prox_aluno["NUM"] = num++;

                        // Adiciona no nome dos alunos
                        nome_alunos.push("⚫ " + prox_aluno.NOME);

                        // Adiciona na tabela
                        dataTableListaDeAlunos.row.add(prox_aluno);
                        dataTableListaDeAlunosNumerada.row.add(prox_aluno);

                        if (alunosComGPS.length > 0) {
                            dist = ol.sphere.getDistance(ponto_atual, alunosComGPS[0].COORD);
                        }
                    }
                }

                if (num > num_original + 1) {
                    plotarMarcadorNumerico(aluno_original, String(num_original) + "-" + String(num - 1), nome_alunos);
                } else {
                    plotarMarcadorNumerico(aluno_original, String(num - 1), nome_alunos);
                }
            }

            let alunosSemGPS = novaListaDeAlunos.filter(aluno => !(aluno["LOC_LONGITUDE"] != null && aluno["LOC_LONGITUDE"] != undefined &&
                aluno["LOC_LATITUDE"] != null && aluno["LOC_LATITUDE"] != undefined &&
                aluno["LOC_LATITUDE"] != "" && aluno["LOC_LONGITUDE"] != ""))
            alunosSemGPS.forEach(aluno => {
                aluno["NUM"] = "---";
                dataTableListaDeAlunos.row.add(aluno);
                dataTableListaDeAlunosNumerada.row.add(aluno);
            })
        } catch (error) {
            dataTableListaDeAlunos.clear();
            dataTableListaDeAlunosNumerada.clear();

            listaDeAlunos.forEach(aluno => {
                dataTableListaDeAlunos.row.add(aluno);
            })
        } finally {
            atualizaMapaOpenLayers(mapa, malhaSource);
        }
    } else {
        listaDeAlunos.forEach(aluno => {
            dataTableListaDeAlunos.row.add(aluno);
        })
    }

    listaDeEscolas.forEach(escola => {
        if (escola["LOC_LONGITUDE"] != null && escola["LOC_LONGITUDE"] != undefined &&
            escola["LOC_LATITUDE"] != null && escola["LOC_LATITUDE"] != undefined) {
            plotarEscola(escola);
        }

        dataTableListaDeEscolas.row.add(escola);
    })

    dataTableListaDeAlunos.draw()
    dataTableListaDeAlunosNumerada.draw()
    dataTableListaDeEscolas.draw()
    return true;
}

$("#detalheInitBtn").trigger("click");

$("#detalheMapa").on("click", async () => {
    await atualizaMapaOpenLayers(mapa, malhaSource);
})
action = "detalharRota";

