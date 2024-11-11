const conversionOptions = {
  category:,
  image: ["JPG", "PNG", "WebP", "BMP"],
  text: ["PDF", "HTML", "TXT"],
  audio: ["MP3", "WAV", "OGG"],
  document: ["TXT", "HTML", "PDF", "CSV"]
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
  } else if (category === "document") {
    convertDocumentFile(format);
  } else {
    alert("Unsupported category selected.");
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
  alert("Audio conversion is not yet supported for GitHub Pages.");
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
    } else if (format === "pdf") {
      const pdf = new jsPDF();
      pdf.text(doc.value, 10, 10);
      const pdfBlob = pdf.output('blob');
      downloadFile(pdfBlob, "converted_document.pdf");
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
