const BASE_URL = '/api/usuarios';

async function buscar(endpoint) {
    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`);

        if (!response.ok) {
            console.error(`Erro em ${endpoint}:`, response.status);
            return [];
        }

        const dados = await response.json();

        return Array.isArray(dados) ? dados : [];
    } catch (erro) {
        console.error(`Erro carregando ${endpoint}:`, erro);
        return [];
    }
}

export async function fetchMusicos() {
    try {
        const response = await fetch(BASE_URL);

        if (!response.ok) return [];

        const dados = await response.json();

        return Array.isArray(dados) ? dados : [];
    } catch (erro) {
        console.error(erro);
        return [];
    }
}

export async function fetchDados() {

          const [
          instrumentos,
          generos,
          daws,
          disponibilidades,
          areas
      ] = await Promise.all([
          buscar("instrumentos"),
          buscar("generos"),
          buscar("daws"),
          buscar("disponibilidades"),
          buscar("areas")
      ]);

      console.log({
          instrumentos,
          generos,
          daws,
          disponibilidades,
          areas
      });

    return {
        instrumentos: instrumentos.map(nome => ({
            id: nome,
            nome
        })),

        generos: generos.map(nome => ({
            id: nome,
            nome
        })),

        daws: daws.map(nome => ({
            id: nome,
            nome
        })),

        disponibilidade: disponibilidades.map(nome => ({
            id: nome,
            label: nome,
            icon: "fa-clock"
        })),

        areas: areas.map(nome => ({
            id: nome,
            nome,
            icon: iconeArea(nome)
        }))
    };
}

function iconeArea(area) {

    const icons = {
        Vocalista: "fa-microphone",
        Instrumentista: "fa-guitar",
        Produtor: "fa-sliders",
        Compositor: "fa-pen-nib",
        DJ: "fa-headphones",
        Beatmaker: "fa-drum"
    };

    return icons[area] || "fa-music";
}