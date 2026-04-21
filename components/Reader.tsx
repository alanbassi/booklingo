import React, { useRef, useEffect, useState, memo } from 'react';
import { LoadedPDF, ReaderTheme, SelectionData } from '../types';

declare const pdfjsLib: any;

interface ReaderProps {
    pdfDocument: LoadedPDF;
    currentPage: number;
    theme: ReaderTheme;
    zoomLevel: number;
    onTextSelect: (data: SelectionData) => void;
    onPageChange: (page: number) => void;
    onScroll?: () => void;
}

// Individual Page Component
const PDFPageRenderer = memo(({ 
    pageNumber, 
    pdfProxy, 
    scale, 
    onInView,
}: { 
    pageNumber: number; 
    pdfProxy: any; 
    scale: number;
    onInView: (page: number) => void;
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<{ width: number, height: number } | null>(null);

    // Render Page Content
    useEffect(() => {
        let isCancelled = false;

        const renderPage = async () => {
            if (!pdfProxy || !canvasRef.current || !textLayerRef.current) return;

            try {
                const page = await pdfProxy.getPage(pageNumber);
                if (isCancelled) return;

                // 1. Calculate Viewport
                // We use standard scale.
                const viewport = page.getViewport({ scale });
                
                // 2. High DPI Support (Retina Screens)
                // This is crucial for crisp text and correct alignment
                const outputScale = window.devicePixelRatio || 1;

                setDimensions({ 
                    width: viewport.width, 
                    height: viewport.height 
                });

                // Prepare canvas with high-DPI scaling
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                // Set actual pixel dimensions (scaled)
                canvas.width = Math.floor(viewport.width * outputScale);
                canvas.height = Math.floor(viewport.height * outputScale);

                // Set CSS display dimensions (standard)
                canvas.style.width = Math.floor(viewport.width) + "px";
                canvas.style.height = Math.floor(viewport.height) + "px";

                // Normalize coordinate system for high-DPI
                const transform = outputScale !== 1 
                ? [outputScale, 0, 0, outputScale, 0, 0] 
                : null;

                // Render PDF to Canvas
                const renderContext = {
                    canvasContext: context,
                    transform: transform,
                    viewport: viewport,
                };
                
                // Cancel previous render if any? (simplified here)
                await page.render(renderContext).promise;

                if (isCancelled) return;

                // 3. Render Text Layer
                // Clear previous content
                textLayerRef.current.innerHTML = '';
                
                // Explicitly set dimensions on text layer to match viewport CSS dimensions
                textLayerRef.current.style.width = Math.floor(viewport.width) + "px";
                textLayerRef.current.style.height = Math.floor(viewport.height) + "px";
                // Ensure the --scale-factor var is set for the CSS transforms in pdf_viewer.css
                textLayerRef.current.style.setProperty('--scale-factor', `${scale}`);

                // Fetch text content
                const textContentSource = await page.getTextContent();
                
                // Use the library's renderTextLayer
                await pdfjsLib.renderTextLayer({
                    textContentSource: textContentSource,
                    container: textLayerRef.current,
                    viewport: viewport,
                    textDivs: []
                }).promise;

            } catch (error) {
                console.error(`Error rendering page ${pageNumber}:`, error);
            }
        };

        renderPage();

        return () => {
            isCancelled = true;
        };
    }, [pdfProxy, pageNumber, scale]); 

    // Intersection Observer
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onInView(pageNumber);
                }
            },
            { threshold: 0.5 } 
        );

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [pageNumber, onInView]);

    return (
        <div 
            ref={containerRef}
            className="pdf-page-container bg-white"
            style={{ 
                width: dimensions ? dimensions.width : 'auto', 
                height: dimensions ? dimensions.height : '500px'
            }}
        >
            <canvas 
                ref={canvasRef} 
                className="block"
            />
            {/* The class 'textLayer' is essential for pdf_viewer.css */}
            <div ref={textLayerRef} className="textLayer" />
            
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-brand-muted text-xs font-medium select-none">
                {pageNumber}
            </div>
        </div>
    );
});

export const Reader: React.FC<ReaderProps> = ({ 
    pdfDocument, 
    currentPage, 
    theme, 
    zoomLevel, 
    onTextSelect,
    onPageChange,
    onScroll
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Apply theme classes to the container
    const getThemeClasses = () => {
        switch (theme) {
            case ReaderTheme.SEPIA:
                return 'bg-brand-surface pdf-sepia-mode';
            case ReaderTheme.DARK:
                return 'bg-brand-dark pdf-dark-mode';
            case ReaderTheme.LIGHT:
            default:
                return 'bg-brand-surface';
        }
    };

    const handleMouseUp = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

        // Auto-expand selection to full words (Snap to Word)
        try {
            const range = selection.getRangeAt(0);
            if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
                const node = range.startContainer;
                const textContent = node.textContent || '';
                let start = range.startOffset;
                let end = range.endOffset;

                // Match letters and numbers across languages.
                const isWordChar = (char: string) => /[\p{L}\p{N}]/u.test(char);

                // Expand start backwards
                while (start > 0 && isWordChar(textContent[start - 1])) {
                    start--;
                }
                // Expand end forwards
                while (end < textContent.length && isWordChar(textContent[end])) {
                    end++;
                }

                // Apply new range if it changed
                if (start !== range.startOffset || end !== range.endOffset) {
                    const newRange = document.createRange();
                    newRange.setStart(node, start);
                    newRange.setEnd(node, end);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            }
        } catch (e) {
            console.warn("Could not expand selection", e);
        }

        const text = selection.toString().trim();
        
        if (text.length > 0) {
            // Get coordinates for the popover
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            onTextSelect({
                text,
                rect: {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                }
            });
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`flex-1 h-full overflow-y-auto transition-colors duration-300 ${getThemeClasses()}`}
            onMouseUp={handleMouseUp}
            onScroll={onScroll}
        >
            <div className="py-12 px-4 min-h-full flex flex-col items-center">
                {Array.from({ length: pdfDocument.numPages }, (_, i) => i + 1).map((pageNum) => (
                    <PDFPageRenderer 
                        key={pageNum}
                        pageNumber={pageNum}
                        pdfProxy={pdfDocument.proxy}
                        scale={zoomLevel / 10} 
                        onInView={onPageChange}
                    />
                ))}
            </div>
        </div>
    );
};
