import jsPDF from "jspdf"

interface AudioData {
  blob: Blob
  url: string
  name: string
  duration: number
  analysisResults?: any
}

// New interface for passing canvas captures
interface ReportVisuals {
  radarCanvas?: string; // Base64 string
  topographyCanvas?: string; // Base64 string
  oscilloscopeCanvas?: string;
  spectrogramCanvas?: string;
}

type ProgressCallback = (progress: number, stage: string) => void

export const generatePDFReport = async (
  audioData: AudioData,
  onProgress?: ProgressCallback,
  visuals?: ReportVisuals // Added visuals parameter
): Promise<void> => {
  if (!audioData.analysisResults) {
    throw new Error("No analysis results available for PDF generation")
  }

  try {
    const autoTable = (await import("jspdf-autotable")).default
    const doc = new jsPDF()
    const results = audioData.analysisResults

    const updateProgress = (progress: number, stage: string) => {
      if (onProgress) onProgress(progress, stage)
    }

    updateProgress(10, "Initializing Forensic PDF...")

    // --- Page 1: Metadata & Visuals ---
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(59, 130, 246) // Blue-500
    doc.text("FORENSIC INTELLIGENCE REPORT", 20, 25)

    doc.setDrawColor(59, 130, 246)
    doc.setLineWidth(1)
    doc.line(20, 30, 190, 30)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 38)
    doc.text(`Case ID: ${audioData.name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 12).toUpperCase()}`, 120, 38)

    let yPosition = 45

    // Summary Table
    autoTable(doc, {
      startY: yPosition,
      head: [["PARAMETER", "DETECTED VALUE"]],
      body: [
        ["FILE SOURCE", audioData.name],
        ["DURATION", `${audioData.duration?.toFixed(2)}s`],
        ["DETECTED SPEAKERS", new Set(results.diarization?.segments.map((s: any) => s.speaker)).size.toString()],
        ["AUDIO FINGERPRINT", Math.random().toString(36).substring(2, 15).toUpperCase()], // Sim
      ],
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [74, 222, 128], fontStyle: 'bold' }, // Dark Slate with Neon Green text
      styles: { fontSize: 9, cellPadding: 2 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15

    // --- ADDING THE VISUAL SNAPSHOTS ---
    if (visuals) {
      doc.setFontSize(14)
      doc.setTextColor(59, 130, 246)
      doc.text("EVIDENCE VISUALIZATION MANIFEST", 20, yPosition)
      doc.line(20, yPosition + 2, 100, yPosition + 2)
      yPosition += 10

      // Row 1: 2D & 3D Maps
      let row1Y = yPosition;
      // Add Radar View
      if (visuals.radarCanvas) {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("EXHIBIT A: SPATIAL 2D MAPPING", 20, row1Y);
        doc.addImage(visuals.radarCanvas, 'PNG', 20, row1Y + 2, 80, 60);
      }

      // Add Topography View
      if (visuals.topographyCanvas) {
        doc.text("EXHIBIT B: 3D VOXEL TOPOGRAPHY", 110, row1Y);
        doc.addImage(visuals.topographyCanvas, 'PNG', 110, row1Y + 2, 80, 60);
      }

      yPosition += 70;

      // Row 2: Oscilloscope & Spectrogram
      if (visuals.oscilloscopeCanvas || visuals.spectrogramCanvas) {
        let row2Y = yPosition;
        if (visuals.oscilloscopeCanvas) {
          doc.text("EXHIBIT C: SIGNAL OSCILLOSCOPE", 20, row2Y);
          doc.addImage(visuals.oscilloscopeCanvas, 'PNG', 20, row2Y + 2, 80, 40);
        }
        if (visuals.spectrogramCanvas) {
          doc.text("EXHIBIT D: MULTI-TRACK SPECTRAL HEATMAP", 110, row2Y);
          doc.addImage(visuals.spectrogramCanvas, 'PNG', 110, row2Y + 2, 80, 40);
        }
        yPosition += 50;
      }
    }

    updateProgress(40, "Exporting Speaker Diarization...");

    // --- Speaker Diarization Table ---
    if (results.diarization?.segments?.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246);
      doc.text("SPEAKER DIARIZATION ANALYSIS", 20, 25);

      const diarizationData = results.diarization.segments.map((seg: any) => [
        seg.speaker,
        `${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s`,
        `${(seg.end - seg.start).toFixed(2)}s`,
        (seg.confidence * 100).toFixed(0) + "%"
      ]);

      autoTable(doc, {
        startY: 35,
        head: [["SPEAKER ID", "TIMESTAMPS", "DURATION", "CONFIDENCE"]],
        body: diarizationData,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
        styles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [241, 245, 249] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    updateProgress(60, "Documenting Acoustic Events...");

    // --- Event Log Table ---
    if (results.soundEvents?.length > 0) {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 25;
      }

      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246);
      doc.text("DETECTED ACOUSTIC EVENTS", 20, yPosition);

      const eventData = results.soundEvents.map((ev: any) => [
        ev.type || "Unknown",
        `${ev.time}s`,
        `${ev.frequency} Hz`,
        `${ev.decibels} dB`,
        ((ev.confidence || 0) * 100).toFixed(0) + "%"
      ]);

      autoTable(doc, {
        startY: yPosition + 10,
        head: [["EVENT TYPE", "TIME ONSET", "CENTER FREQ", "INTENSITY", "CONFIDENCE"]],
        body: eventData,
        theme: "striped",
        headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255] }, // Red header for alerts
        styles: { fontSize: 9 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    updateProgress(80, "Compiling Audio Segments...");

    // --- Audio Segments Table ---
    if (results.segments?.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 25;
      }

      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246);
      doc.text("AUDIO SEGMENT CLASSIFICATION", 20, yPosition);

      const segmentData = results.segments.map((seg: any) => [
        `${(seg.start || 0).toFixed(2)}s - ${(seg.end || 0).toFixed(2)}s`,
        seg.label || "Unclassified",
        `${((seg.score || 0) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: yPosition + 10,
        head: [["TIME RANGE", "CLASSIFICATION", "CONFIDENCE SCORE"]],
        body: segmentData,
        theme: "grid",
        headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] }, // Teal header
      });
    }

    // --- Footer with Signature ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount} - Forensic Intelligence System V2.4`, 100, 290, { align: 'center' });
    }

    updateProgress(100, "Finalizing Report...")
    doc.save(`Forensic_Analysis_${Date.now()}.pdf`)

  } catch (error) {
    console.error("PDF Error:", error)
    alert("Error generating PDF. See console for details.") // Add alert for debugging
  }
}