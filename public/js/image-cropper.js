const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const MAX_ORIGINAL_IMAGE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];

export function validarImagemOriginal(arquivo) {
  if (!ALLOWED_IMAGE_TYPES.includes(arquivo.type)) {
    return "Formato não suportado. Use jpeg, png ou gif.";
  }
  if (arquivo.size > MAX_ORIGINAL_IMAGE_BYTES) {
    return "A imagem original deve ter no máximo 15 MB.";
  }
  return null;
}

export function calcularZoomMinimo(imagemLargura, imagemAltura, molduraLargura, molduraAltura) {
  return Math.max(
    molduraLargura / imagemLargura,
    molduraAltura / imagemAltura,
  );
}

export function limitarDeslocamento(x, y, larguraRenderizada, alturaRenderizada, molduraLargura, molduraAltura) {
  return {
    x: Math.min(0, Math.max(molduraLargura - larguraRenderizada, x)),
    y: Math.min(0, Math.max(molduraAltura - alturaRenderizada, y)),
  };
}

export function converterMolduraParaOrigem(
  x,
  y,
  escala,
  molduraLargura,
  molduraAltura,
  imagemLargura,
  imagemAltura,
) {
  const origemX = Math.max(0, -x / escala);
  const origemY = Math.max(0, -y / escala);
  return {
    x: origemX,
    y: origemY,
    largura: Math.min(imagemLargura - origemX, molduraLargura / escala),
    altura: Math.min(imagemAltura - origemY, molduraAltura / escala),
  };
}

export function calcularDimensoesSaida(largura, altura, saidaMax) {
  const escala = Math.min(1, saidaMax / Math.max(largura, altura));
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  };
}

function criarBotao(texto, classe, ariaLabel = texto) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = classe;
  botao.textContent = texto;
  botao.setAttribute("aria-label", ariaLabel);
  return botao;
}

async function carregarImagem(arquivo) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(arquivo, {
        imageOrientation: "from-image",
      });
    } catch {
      return createImageBitmap(arquivo);
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagem);
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir esta imagem."));
    };
    imagem.src = url;
  });
}

function imagemParaBlob(canvas, tipo, qualidade) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível preparar a imagem."));
      },
      tipo,
      qualidade,
    );
  });
}

async function exportarRecorte(imagem, arquivo, recorte, saidaMax) {
  let dimensoes = calcularDimensoesSaida(
    recorte.largura,
    recorte.altura,
    saidaMax,
  );
  const canvas = document.createElement("canvas");
  const manterTransparencia = arquivo.type === "image/png";
  let blob = null;

  for (let tentativaDimensao = 0; tentativaDimensao < 8; tentativaDimensao++) {
    canvas.width = dimensoes.largura;
    canvas.height = dimensoes.altura;
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("Seu navegador não suporta recorte de imagem.");
    contexto.clearRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(
      imagem,
      recorte.x,
      recorte.y,
      recorte.largura,
      recorte.altura,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    let possuiTransparencia = false;
    if (manterTransparencia) {
      const pixels = contexto.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let indice = 3; indice < pixels.length; indice += 4) {
        if (pixels[indice] < 255) {
          possuiTransparencia = true;
          break;
        }
      }
    }

    if (possuiTransparencia) {
      blob = await imagemParaBlob(canvas, "image/png");
    } else {
      for (const qualidade of [0.9, 0.75, 0.6, 0.5]) {
        blob = await imagemParaBlob(canvas, "image/jpeg", qualidade);
        if (blob.size <= MAX_UPLOAD_BYTES) break;
      }
    }
    if (blob.size <= MAX_UPLOAD_BYTES) break;

    const escala = Math.min(
      0.85,
      Math.sqrt(MAX_UPLOAD_BYTES / blob.size) * 0.9,
    );
    dimensoes = {
      largura: Math.max(1, Math.floor(dimensoes.largura * escala)),
      altura: Math.max(1, Math.floor(dimensoes.altura * escala)),
    };
  }

  if (!blob || blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("Não foi possível reduzir a imagem para menos de 2 MB.");
  }

  const png = blob.type === "image/png";
  return new File([blob], png ? "imagem.png" : "imagem.jpg", {
    type: png ? "image/png" : "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function abrirRecorte(
  arquivo,
  { proporcao = 1, saidaMax = 512, circular = false } = {},
) {
  const imagem = await carregarImagem(arquivo);
  const proporcoes = [
    { valor: 1, rotulo: "1:1" },
    { valor: 4 / 5, rotulo: "4:5" },
    { valor: 16 / 9, rotulo: "16:9" },
    { valor: imagem.width / imagem.height, rotulo: "Original" },
  ];
  const selecionarProporcao = proporcao === "seletor";
  let proporcaoAtual = selecionarProporcao ? 1 : proporcao;
  let resultado = null;

  const dialog = document.createElement("dialog");
  dialog.className = "image-cropper-dialog";
  dialog.setAttribute("aria-labelledby", "imageCropperTitle");
  const conteudo = document.createElement("div");
  conteudo.className = "image-cropper";
  const titulo = document.createElement("h2");
  titulo.id = "imageCropperTitle";
  titulo.textContent = "Enquadrar imagem";
  conteudo.appendChild(titulo);

  const avisoGif = document.createElement("p");
  avisoGif.className = "image-cropper-gif hidden";
  avisoGif.textContent =
    "O GIF animado pode ser enviado original ou recortado como imagem estática.";
  conteudo.appendChild(avisoGif);

  const seletor = document.createElement("select");
  seletor.className = "image-cropper-ratio";
  seletor.setAttribute("aria-label", "Proporção da imagem");
  proporcoes.forEach((item) => {
    const opcao = document.createElement("option");
    opcao.value = String(item.valor);
    opcao.textContent = item.rotulo;
    seletor.appendChild(opcao);
  });
  seletor.value = "1";
  if (selecionarProporcao) conteudo.appendChild(seletor);

  const moldura = document.createElement("div");
  moldura.className = "image-cropper-frame";
  if (circular) moldura.classList.add("circular");
  moldura.setAttribute("role", "group");
  moldura.tabIndex = 0;
  moldura.setAttribute("aria-label", "Área de recorte; arraste a imagem para enquadrar");
  const tela = document.createElement("canvas");
  tela.className = "image-cropper-canvas";
  moldura.appendChild(tela);
  conteudo.appendChild(moldura);

  const controles = document.createElement("label");
  controles.className = "image-cropper-zoom";
  controles.textContent = "Zoom";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "1";
  slider.max = "4";
  slider.step = "0.01";
  slider.value = "1";
  slider.setAttribute("aria-label", "Zoom da imagem");
  controles.appendChild(slider);
  conteudo.appendChild(controles);

  const botoes = document.createElement("div");
  botoes.className = "image-cropper-actions";
  const originalGif = criarBotao("Enviar GIF original", "btn-outline image-cropper-original");
  const cancelar = criarBotao("Cancelar", "btn-outline");
  const usar = criarBotao("Usar esta foto", "btn-primary");
  if (arquivo.type === "image/gif") {
    if (arquivo.size > MAX_UPLOAD_BYTES) {
      originalGif.disabled = true;
      originalGif.title = "O GIF original precisa ter no máximo 2 MB.";
    }
    avisoGif.classList.remove("hidden");
    botoes.appendChild(originalGif);
  }
  botoes.append(cancelar, usar);
  conteudo.appendChild(botoes);
  const erro = document.createElement("p");
  erro.className = "image-cropper-error";
  erro.setAttribute("role", "alert");
  conteudo.appendChild(erro);
  dialog.appendChild(conteudo);
  document.body.appendChild(dialog);

  const bitmap = imagem;
  let escalaBase = 1;
  let zoom = 1;
  let x = 0;
  let y = 0;
  let larguraFrame = 0;
  let alturaFrame = 0;
  const pointers = new Map();
  let dragOrigem = null;
  let pinchOrigem = null;
  const focoAnterior = document.activeElement;

  function ajustarFrame() {
    const maxLargura = Math.min(420, window.innerWidth - 48);
    larguraFrame = maxLargura;
    alturaFrame = maxLargura / proporcaoAtual;
    if (alturaFrame > Math.min(480, window.innerHeight * 0.48)) {
      alturaFrame = Math.min(480, window.innerHeight * 0.48);
      larguraFrame = alturaFrame * proporcaoAtual;
    }
    moldura.style.width = `${larguraFrame}px`;
    moldura.style.height = `${alturaFrame}px`;

    const dimensoes = { largura: bitmap.width, altura: bitmap.height };
    escalaBase = calcularZoomMinimo(
      dimensoes.largura,
      dimensoes.altura,
      larguraFrame,
      alturaFrame,
    );
    zoom = Math.max(zoom, 1);
    slider.value = String(zoom);
    const larguraRenderizada = dimensoes.largura * escalaBase * zoom;
    const alturaRenderizada = dimensoes.altura * escalaBase * zoom;
    x = (larguraFrame - larguraRenderizada) / 2;
    y = (alturaFrame - alturaRenderizada) / 2;
    desenhar();
  }

  function desenhar() {
    const dimensoes = { largura: bitmap.width, altura: bitmap.height };
    tela.width = Math.round(larguraFrame * window.devicePixelRatio);
    tela.height = Math.round(alturaFrame * window.devicePixelRatio);
    tela.style.width = `${larguraFrame}px`;
    tela.style.height = `${alturaFrame}px`;
    const contexto = tela.getContext("2d");
    if (!contexto) return;
    contexto.scale(window.devicePixelRatio, window.devicePixelRatio);
    contexto.clearRect(0, 0, larguraFrame, alturaFrame);
    if (circular) {
      contexto.save();
      contexto.beginPath();
      contexto.arc(
        larguraFrame / 2,
        alturaFrame / 2,
        Math.min(larguraFrame, alturaFrame) / 2,
        0,
        Math.PI * 2,
      );
      contexto.clip();
    }
    contexto.save();
    contexto.drawImage(
      bitmap,
      x,
      y,
      bitmap.width * escalaBase * zoom,
      bitmap.height * escalaBase * zoom,
    );
    contexto.restore();
    if (circular) contexto.restore();
  }

  function definirZoom(novoZoom, centroX = larguraFrame / 2, centroY = alturaFrame / 2) {
    const dimensoes = { largura: bitmap.width, altura: bitmap.height };
    const zoomAnterior = zoom;
    zoom = Math.min(4, Math.max(1, novoZoom));
    const escalaAnterior = escalaBase * zoomAnterior;
    const escalaAtual = escalaBase * zoom;
    const pontoImagemX = (centroX - x) / escalaAnterior;
    const pontoImagemY = (centroY - y) / escalaAnterior;
    x = centroX - pontoImagemX * escalaAtual;
    y = centroY - pontoImagemY * escalaAtual;
    const limitado = limitarDeslocamento(
      x,
      y,
      dimensoes.largura * escalaAtual,
      dimensoes.altura * escalaAtual,
      larguraFrame,
      alturaFrame,
    );
    x = limitado.x;
    y = limitado.y;
    slider.value = String(zoom);
    desenhar();
  }

  function concluir(valor) {
    resultado = valor;
    if (dialog.open) dialog.close();
    else fechar();
  }

  function limpar() {
    pointers.clear();
    if (typeof bitmap.close === "function") bitmap.close();
    dialog.remove();
    window.removeEventListener("resize", ajustarFrame);
    if (focoAnterior instanceof HTMLElement) focoAnterior.focus();
  }

  function fechar() {
    limpar();
    return resultado;
  }

  dialog.addEventListener("close", fechar, { once: true });
  dialog.addEventListener("cancel", (evento) => {
    evento.preventDefault();
    concluir(null);
  });
  cancelar.addEventListener("click", () => concluir(null));
  originalGif.addEventListener("click", () =>
    concluir(
      new File([arquivo], "imagem.gif", {
        type: "image/gif",
        lastModified: arquivo.lastModified,
      }),
    ),
  );
  seletor.addEventListener("change", () => {
    proporcaoAtual = Number(seletor.value);
    zoom = 1;
    ajustarFrame();
  });
  slider.addEventListener("input", () => definirZoom(Number(slider.value)));
  usar.addEventListener("click", async () => {
    usar.disabled = true;
    erro.textContent = "";
    try {
      const escala = escalaBase * zoom;
      const dimensoes = { largura: bitmap.width, altura: bitmap.height };
      const limitado = limitarDeslocamento(
        x,
        y,
        dimensoes.largura * escala,
        dimensoes.altura * escala,
        larguraFrame,
        alturaFrame,
      );
      const recorte = converterMolduraParaOrigem(
        limitado.x,
        limitado.y,
        escala,
        larguraFrame,
        alturaFrame,
        dimensoes.largura,
        dimensoes.altura,
      );
      const tipoFonte = arquivo.type === "image/png"
        ? arquivo
        : new File([arquivo], "origem.jpg", { type: "image/jpeg" });
      const file = await exportarRecorte(bitmap, tipoFonte, recorte, saidaMax);
      concluir(file);
    } catch (exportError) {
      erro.textContent = exportError.message || "Não foi possível recortar a imagem.";
      usar.disabled = false;
    }
  });

  moldura.addEventListener("pointerdown", (evento) => {
    evento.preventDefault();
    moldura.setPointerCapture(evento.pointerId);
    pointers.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    if (pointers.size === 1) {
      dragOrigem = { x: evento.clientX, y: evento.clientY, imageX: x, imageY: y };
    } else if (pointers.size === 2) {
      const pontos = [...pointers.values()];
      pinchOrigem = {
        distancia: Math.hypot(pontos[0].x - pontos[1].x, pontos[0].y - pontos[1].y),
        zoom,
      };
    }
  });
  moldura.addEventListener("pointermove", (evento) => {
    if (!pointers.has(evento.pointerId)) return;
    pointers.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    if (pointers.size >= 2 && pinchOrigem) {
      const pontos = [...pointers.values()];
      const distancia = Math.hypot(pontos[0].x - pontos[1].x, pontos[0].y - pontos[1].y);
      const rect = moldura.getBoundingClientRect();
      definirZoom(
        pinchOrigem.zoom * distancia / Math.max(1, pinchOrigem.distancia),
        ((pontos[0].x + pontos[1].x) / 2) - rect.left,
        ((pontos[0].y + pontos[1].y) / 2) - rect.top,
      );
    } else if (dragOrigem) {
      const dimensoes = { largura: bitmap.width, altura: bitmap.height };
      const novo = limitarDeslocamento(
        dragOrigem.imageX + evento.clientX - dragOrigem.x,
        dragOrigem.imageY + evento.clientY - dragOrigem.y,
        dimensoes.largura * escalaBase * zoom,
        dimensoes.altura * escalaBase * zoom,
        larguraFrame,
        alturaFrame,
      );
      x = novo.x;
      y = novo.y;
      desenhar();
    }
  });
  const soltarPonteiro = (evento) => {
    pointers.delete(evento.pointerId);
    dragOrigem = null;
    pinchOrigem = null;
    if (pointers.size === 1) {
      const [id, ponto] = [...pointers.entries()][0];
      dragOrigem = { x: ponto.x, y: ponto.y, imageX: x, imageY: y };
      if (moldura.hasPointerCapture(id)) moldura.releasePointerCapture(id);
    }
  };
  moldura.addEventListener("pointerup", soltarPonteiro);
  moldura.addEventListener("pointercancel", soltarPonteiro);
  moldura.addEventListener("wheel", (evento) => {
    evento.preventDefault();
    const rect = moldura.getBoundingClientRect();
    definirZoom(
      zoom * (evento.deltaY < 0 ? 1.08 : 0.92),
      evento.clientX - rect.left,
      evento.clientY - rect.top,
    );
  }, { passive: false });

  dialog.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      evento.preventDefault();
      concluir(null);
      return;
    }
    const emControle = evento.target instanceof HTMLElement &&
      evento.target.matches("button, input, select, textarea");
    if (!emControle && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(evento.key)) {
      evento.preventDefault();
      const dimensoes = { largura: bitmap.width, altura: bitmap.height };
      const movimento = evento.shiftKey ? 20 : 5;
      const novo = limitarDeslocamento(
        x + (evento.key === "ArrowLeft" ? movimento : evento.key === "ArrowRight" ? -movimento : 0),
        y + (evento.key === "ArrowUp" ? movimento : evento.key === "ArrowDown" ? -movimento : 0),
        dimensoes.largura * escalaBase * zoom,
        dimensoes.altura * escalaBase * zoom,
        larguraFrame,
        alturaFrame,
      );
      x = novo.x;
      y = novo.y;
      desenhar();
    } else if (!emControle && (evento.key === "+" || evento.key === "=" || evento.key === "-")) {
      evento.preventDefault();
      definirZoom(zoom * (evento.key === "-" ? 0.9 : 1.1));
    } else if (evento.key === "Tab") {
      const focaveis = [...dialog.querySelectorAll("button:not(:disabled), input, select, [tabindex='0']")];
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
  });

  window.addEventListener("resize", ajustarFrame);
  dialog.showModal();
  ajustarFrame();
  cancelar.focus();

  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(resultado), { once: true });
  });
}
