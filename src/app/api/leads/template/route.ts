import { NextResponse } from "next/server";

// GET /api/leads/template - Download CSV template
export async function GET() {
  try {
    // CSV Headers with descriptions in comments
    const headers = [
      "nome",           // Required - Lead name
      "email",          // Optional - Email address
      "telefono",       // Optional - Phone number
      "corso",          // Optional - Course name (must match existing course)
      "campagna",       // Optional - Campaign name (must match existing campaign)
      "stato",          // Optional - Status: NUOVO, CONTATTATO, IN_TRATTATIVA, ISCRITTO, PERSO
      "note",           // Optional - Notes
      "assegnato_a",    // Optional - Commercial email (must match existing user)
    ];

    // Example data rows
    const exampleRows = [
      [
        "Mario Rossi",
        "mario.rossi@email.it",
        "+39 333 1234567",
        "Corso Web Development",
        "Campagna Facebook Marzo",
        "NUOVO",
        "Interessato al corso serale",
        "commerciale@azienda.it",
      ],
      [
        "Laura Bianchi",
        "laura.bianchi@email.it",
        "+39 340 9876543",
        "Corso Data Science",
        "Campagna LinkedIn Q1",
        "CONTATTATO",
        "Ha chiesto informazioni sui prezzi",
        "",
      ],
      [
        "Giuseppe Verdi",
        "g.verdi@example.com",
        "+39 345 1112233",
        "",
        "",
        "NUOVO",
        "",
        "",
      ],
    ];

    // Build CSV content
    const csvRows = [
      headers.join(","),
      ...exampleRows.map((row) =>
        row.map((value) => {
          // Escape values with commas or quotes
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      ),
    ];

    // Add BOM for Excel compatibility with UTF-8
    const BOM = "\uFEFF";
    const csvContent = BOM + csvRows.join("\r\n");

    // Create response with proper headers for download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=template_importazione_lead.csv",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Errore durante la generazione del template" },
      { status: 500 }
    );
  }
}
