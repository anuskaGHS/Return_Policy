"""Generate synthetic My Finances demo PDFs.

Run from the repository root:
    python scripts/make_sample_finance_pdfs.py

All data is fictional and for local demo/testing only.
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import mm

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "sample-docs"
OUT.mkdir(parents=True, exist_ok=True)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="DocTitle", parent=styles["Title"], alignment=TA_CENTER, fontSize=17, leading=21, spaceAfter=8))
styles.add(ParagraphStyle(name="Subtitle", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.HexColor("#555555"), spaceAfter=12))
styles.add(ParagraphStyle(name="Section", parent=styles["Heading2"], fontSize=11, leading=14, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name="SmallNote", parent=styles["Normal"], fontSize=8, leading=11, textColor=colors.HexColor("#444444")))

DOCS = [
    {
        "filename": "salary-slip.pdf",
        "title": "Salary Slip",
        "subtitle": "Pay period: September 2026",
        "sections": [
            ("Employee and Employer", [("Employee", "Demo Employee"), ("Employer", "Example Technology Services Pvt. Ltd."), ("Employee reference", "DEMO-EMP-1042"), ("Pay date", "30 September 2026")]),
            ("Earnings", [("Basic salary", "₹65,000"), ("House rent allowance", "₹26,000"), ("Other allowances", "₹9,000"), ("Monthly gross salary", "₹100,000")]),
            ("Deductions and Net Pay", [("Provident fund and other deductions", "₹8,000"), ("Estimated net pay", "₹92,000")]),
        ],
        "note": "Test salary-slip detection and monthly gross salary extraction.",
    },
    {
        "filename": "home-loan-schedule.pdf",
        "title": "Home Loan Repayment Schedule",
        "subtitle": "Illustrative loan account summary",
        "sections": [
            ("Loan Details", [("Borrower", "Demo Borrower"), ("Lender", "Example Housing Finance"), ("Loan reference", "DEMO-HL-70031"), ("Original principal", "₹4,000,000"), ("Annual interest rate", "8.5%"), ("Loan tenure", "240 months")]),
            ("Repayment Details", [("Monthly EMI", "₹34,713"), ("Outstanding principal", "₹3,820,000"), ("Next payment date", "05 November 2026"), ("Schedule status", "Illustrative / demo only")]),
        ],
        "note": "Test home-loan detection and principal, EMI, rate, and balance extraction.",
    },
    {
        "filename": "term-policy.pdf",
        "title": "Term Life Insurance Policy Summary",
        "subtitle": "Illustrative policy schedule",
        "sections": [
            ("Policy Details", [("Policyholder", "Demo Policyholder"), ("Insurer", "Example Life Assurance"), ("Policy reference", "DEMO-TERM-55082"), ("Policy type", "Term life insurance"), ("Policy term", "30 years")]),
            ("Coverage and Premium", [("Sum assured", "₹10,000,000"), ("Annual premium", "₹14,500"), ("Policy start date", "01 April 2026"), ("Renewal frequency", "Annual")]),
        ],
        "note": "Test term-policy detection and sum assured / annual premium extraction.",
    },
    {
        "filename": "fd-receipt.pdf",
        "title": "Fixed Deposit Receipt",
        "subtitle": "Illustrative deposit confirmation",
        "sections": [
            ("Deposit Details", [("Depositor", "Demo Depositor"), ("Institution", "Example Bank"), ("Deposit reference", "DEMO-FD-29114"), ("Principal amount", "₹500,000"), ("Annual interest rate", "7.1%")]),
            ("Maturity Details", [("Deposit date", "25 October 2026"), ("Maturity date", "25 October 2027"), ("Tenure", "12 months"), ("Estimated maturity value", "₹535,500"), ("Interest payout", "At maturity")]),
        ],
        "note": "Test FD detection and principal, rate, and maturity extraction.",
    },
    {
        "filename": "sip-statement.pdf",
        "title": "Systematic Investment Plan Statement",
        "subtitle": "Illustrative mutual fund SIP summary",
        "sections": [
            ("Investment Details", [("Investor", "Demo Investor"), ("Fund", "Example Balanced Index Fund"), ("Folio reference", "DEMO-SIP-88021"), ("SIP frequency", "Monthly")]),
            ("Contribution and Value", [("Monthly SIP amount", "₹8,000"), ("Total contributions", "₹96,000"), ("Current illustrative value", "₹101,250"), ("First instalment", "05 November 2025"), ("Next instalment", "05 November 2026")]),
        ],
        "note": "Test SIP detection and monthly SIP / investment value extraction.",
    },
]

def make_pdf(filename, title, subtitle, sections, note):
    path = OUT / filename
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=17*mm, bottomMargin=17*mm)
    story = [
        Paragraph("SYNTHETIC DEMO DOCUMENT — NOT A REAL FINANCIAL RECORD", styles["Subtitle"]),
        Paragraph(title, styles["DocTitle"]),
        Paragraph(subtitle, styles["Subtitle"]),
    ]
    for heading, rows in sections:
        story.append(Paragraph(heading, styles["Section"]))
        data = [[Paragraph(f"<b>{key}</b>", styles["BodyText"]), Paragraph(str(value), styles["BodyText"])] for key, value in rows]
        table = Table(data, colWidths=[62*mm, 98*mm], hAlign="LEFT")
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F0F3F7")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C8CED8")),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.extend([table, Spacer(1, 5*mm)])
    story.extend([
        Spacer(1, 4*mm),
        Paragraph(f"<b>Demo note:</b> {note}", styles["SmallNote"]),
        Spacer(1, 3*mm),
        Paragraph("All names, organizations, references, and amounts are fictional and created solely for software testing.", styles["SmallNote"]),
    ])
    doc.build(story)
    print(f"Created {path}")

if __name__ == "__main__":
    for item in DOCS:
        make_pdf(item["filename"], item["title"], item["subtitle"], item["sections"], item["note"])
