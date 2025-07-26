// PDF.js worker path - you'll need to download this
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.js';

let pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 1.5;

// DOM elements
const canvas = document.getElementById('pdf-render'),
      ctx = canvas.getContext('2d'),
      pageNumElement = document.getElementById('page-num'),
      prevPageBtn = document.getElementById('prev-page'),
      nextPageBtn = document.getElementById('next-page'),
      fileInput = document.getElementById('file-input'),
      searchInput = document.getElementById('search-input'),
      searchBtn = document.getElementById('search-btn'),
      resultsList = document.getElementById('results-list');

// Render the page
function renderPage(num) {
    pageRendering = true;
    
    pdfDoc.getPage(num).then(function(page) {
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        const renderTask = page.render(renderContext);

        renderTask.promise.then(function() {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    pageNumElement.textContent = `Page ${num} of ${pdfDoc.numPages}`;
}

// Go to previous page
function onPrevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
}

// Go to next page
function onNextPage() {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
}

// Queue page rendering
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

// Handle file selection
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
        alert('Please select a PDF file.');
        return;
    }

    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedArray = new Uint8Array(this.result);
        
        pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
            pdfDoc = pdf;
            pageNum = 1;
            renderPage(pageNum);
        });
    };
    fileReader.readAsArrayBuffer(file);
});

// Search in PDF
function searchPDF() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm || !pdfDoc) return;
    
    resultsList.innerHTML = '';
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        pdfDoc.getPage(i).then(function(page) {
            return page.getTextContent();
        }).then(function(textContent) {
            const text = textContent.items.map(item => item.str).join(' ');
            if (text.includes(searchTerm)) {
                const li = document.createElement('li');
                li.textContent = `Page ${i}: ${text.substring(text.indexOf(searchTerm) - 20, text.indexOf(searchTerm) + 20)}...`;
                li.onclick = function() {
                    pageNum = i;
                    renderPage(pageNum);
                };
                resultsList.appendChild(li);
            }
        });
    }
}

// Event listeners
prevPageBtn.addEventListener('click', onPrevPage);
nextPageBtn.addEventListener('click', onNextPage);
searchBtn.addEventListener('click', searchPDF);
searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchPDF();
});
