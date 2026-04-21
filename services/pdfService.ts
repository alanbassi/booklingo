import { LoadedPDF } from "../types";

// We assume pdfjsLib is loaded via CDN in index.html
declare const pdfjsLib: any;

export const parsePDF = async (file: File): Promise<LoadedPDF> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target?.result;
                if (!arrayBuffer) {
                    reject(new Error("Failed to read file"));
                    return;
                }

                // Load the PDF document
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                
                resolve({
                    fileName: file.name,
                    numPages: pdf.numPages,
                    proxy: pdf
                });

            } catch (error) {
                console.error("PDF Parsing Error:", error);
                reject(error);
            }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const getPageText = async (pdf: any, pageNumber: number): Promise<string> => {
    try {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        return textContent.items.map((item: any) => item.str).join(' ');
    } catch (e) {
        console.error("Error extracting page text", e);
        return "";
    }
};