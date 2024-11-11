const conversionOptions = {
  image: ["JPG", "PNG", "WebP", "BMP"],
  text: ["PDF", "HTML", "TXT"],
  audio: ["MP3", "WAV", "OGG"],
  video: ["MP4", "WebM", "OGG"],
  pdf: ["Image (PNG)", "Text"],
  document: ["PDF", "TXT", "CSV", "JSON"]
};

document.getElementById("fileInput").addEventListener("change", handleFileUpload);
let fileData = null;
let fileType = "";

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  fileType = file.type;
  const reader = new FileReader();
  reader.onload = function(e) {
    fileData = e.target.result;
    alert("File loaded! Ready to convert.");
  };

  reader.readAsArrayBuffer(file);
}

function updateConversionOptions() {
  const category = document.getElementById("categorySelect").value;
  const formatSelect = document.getElementById("formatSelect");
  formatSelect.innerHTML = "";

  if (conversionOptions[category]) {
    conversionOptions[category].forEach(format => {
      const option = document.createElement("option");
      option.value = format.toLowerCase();
      option.text = format;
      formatSelect.appendChild(option);
    });
  }
}

function convertFile() {
  const category = document.getElementById("categorySelect").value;
  const format = document.getElementById("formatSelect").value;

  if (!fileData) {
    alert("Please upload a file first.");
    return;
  }

  if (category === "image") {
    convertImageFile(format);
  } else if (category === "text") {
    convertTextFile(format);
  } else if (category === "audio") {
    convertAudioFile(format);
  } else if (category === "video") {
    convertVideoFile(format);
  } else if (category === "pdf") {
    convertPdfFile(format);
  } else if (category === "document") {
    convertDocumentFile(format);
  } else {
    alert("Unsupported category selected.");
  }
}

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

async function loadFFmpeg() {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }
}

function convertImageFile(format) {
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([fileData]));
  img.onload = function() {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const mimeType = `image/${format === "jpg" ? "jpeg" : format}`;
    canvas.toBlob(function(blob) {
      downloadFile(blob, `converted_image.${format}`);
    }, mimeType);
  };
}

async function convertTextFile(format) {
  const text = new TextDecoder().decode(fileData);

  if (format === "pdf") {
    const pdf = new jsPDF();
    pdf.text(text, 10, 10);
    const pdfBlob = pdf.output('blob');
    downloadFile(pdfBlob, "converted_text.pdf");
  } else if (format === "html") {
    const htmlContent = `<pre>${text}</pre>`;
    const blob = new Blob([htmlContent], { type: "text/html" });
    downloadFile(blob, "converted_text.html");
  } else if (format === "txt") {
    const blob = new Blob([text], { type: "text/plain" });
    downloadFile(blob, "converted_text.txt");
  }
}

async function convertAudioFile(format) {
  await loadFFmpeg();

  await ffmpeg.FS('writeFile', 'input.wav', await fetchFile(new Uint8Array(fileData)));
  await ffmpeg.run('-i', 'input.wav', `output.${format}`);
  const data = ffmpeg.FS('readFile', `output.${format}`);

  const blob = new Blob([data.buffer], { type: `audio/${format}` });
  downloadFile(blob, `converted_audio.${format}`);
}

async function convertVideoFile(format) {
  await loadFFmpeg();

  await ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(new Uint8Array(fileData)));
  await ffmpeg.run('-i', 'input.mp4', `output.${format}`);
  const data = ffmpeg.FS('readFile', `output.${format}`);

  const blob = new Blob([data.buffer], { type: `video/${format}` });
  downloadFile(blob, `converted_video.${format}`);
}

async function convertPdfFile(format) {
  const pdf = await PDFLib.PDFDocument.load(fileData);

  if (format === "text") {
    const textContent = await pdf.getTextContent();
    const blob = new Blob([textContent], { type: "text/plain" });
    downloadFile(blob, "converted_pdf.txt");
  } else if (format === "image") {
    const pages = pdf.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    page.draw(ctx);

    canvas.toBlob(function(blob) {
      downloadFile(blob, "converted_pdf.png");
    }, 'image/png');
  }
}

async function convertDocumentFile(format) {
  if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const doc = await mammoth.convertToHtml({ arrayBuffer: fileData });
    if (format === "html") {
      const blob = new Blob([doc.value], { type: "text/html" });
      downloadFile(blob, "converted_document.html");
    } else if (format === "txt") {
      const blob = new Blob([doc.value], { type: "text/plain" });
      downloadFile(blob, "converted_document.txt");
    }
  } else if (fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const workbook = XLSX.read(new Uint8Array(fileData), { type: "array" });
    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
      const blob = new Blob([csv], { type: "text/csv" });
      downloadFile(blob, "converted_spreadsheet.csv");
    } else if (format === "json") {
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
      downloadFile(blob, "converted_spreadsheet.json");
    }
  }
}

function downloadFile(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
