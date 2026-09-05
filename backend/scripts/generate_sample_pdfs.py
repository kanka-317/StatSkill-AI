"""
Script to generate official sample PDFs for MoSPI / NSSTA evaluators
to test RAG quiz generation in StatSkill AI.
"""

import os
import pymupdf

def create_nssta_sampling_manual(output_path: str):
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4

    # Header and Title
    page.insert_text((50, 60), "NATIONAL STATISTICAL SYSTEMS TRAINING ACADEMY (NSSTA)", fontsize=13, fontname="helv", color=(0.1, 0.2, 0.45))
    page.insert_text((50, 78), "Ministry of Statistics and Programme Implementation, Government of India", fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
    page.draw_line((50, 88), (545, 88), color=(0.2, 0.4, 0.7), width=1.5)

    page.insert_text((50, 115), "Module 104: Official Survey Sampling & Variance Estimation Manual", fontsize=15, fontname="hebo", color=(0.05, 0.1, 0.25))

    body_text = """
1. INTRODUCTION TO OFFICIAL SURVEY DESIGN
Official large-scale socio-economic surveys conducted by the National Sample Survey Office (NSSO) utilize multi-stage stratified design to balance precision and field enumeration costs. In this design, the first stage units (FSUs) are census villages in the rural sector and Urban Frame Survey (UFS) blocks in the urban sector. The ultimate stage units (USUs) are households or enterprises.

2. STRATIFIED SAMPLING PRINCIPLES
Stratification divides a heterogeneous population into mutually exclusive and collectively exhaustive homogeneous subgroups (strata). Within each stratum, sampling is performed independently. By grouping similar units together, the sampling variance of estimates is substantially reduced compared to simple random sampling (SRS).
Key properties:
- Substratum formation based on population size, household consumption expenditure, or enterprise economic activity.
- Optimum allocation (Neyman Allocation) allocates larger sample sizes to strata with larger size and higher standard deviations.
- Proportional allocation allocates sample units in proportion to the total population of each stratum: n_h = n * (N_h / N).

3. ESTIMATION PROCEDURE AND SURVEY WEIGHTS
Because sampling probabilities differ across strata and stages, sample data must be weighted to derive unbiased national aggregates.
- Design weights (Base weights) are calculated as the reciprocal of inclusion probabilities: W_i = 1 / P_i.
- Multiplier adjustments account for non-response and sample attrition across survey rounds.
- Ratio and regression estimators are utilized using auxiliary census information to calibrate population aggregates.

4. VARIANCE AND SAMPLING ERROR COMPUTATION
Variance estimation in multi-stage surveys uses the Ultimate Cluster Method:
V(Y_hat) = Sum_s [ (n_s / (n_s - 1)) * Sum_i (Y_hat_si - Y_hat_s / n_s)^2 ]
where n_s is the number of sample FSUs in stratum s, and Y_hat_si is the weighted estimate from the i-th FSU. This formulation captures variance contributions from both primary and secondary sampling stages without requiring detailed cluster-level covariance calculations.

5. QUALITY METRICS: COEFFICIENT OF VARIATION (CV)
For official statistical releases, estimates with a Relative Standard Error (RSE) or Coefficient of Variation (CV) below 5% are classified as reliable for district-level policy formulation. Estimates with CV between 5% and 15% require state-level pooling, while estimates exceeding 20% must be flagged with explanatory caveats in statistical reports.
"""

    rect = pymupdf.Rect(50, 130, 545, 800)
    page.insert_textbox(rect, body_text.strip(), fontsize=10, fontname="helv", lineheight=1.45, color=(0.15, 0.15, 0.15))
    
    # Footer
    page.draw_line((50, 810), (545, 810), color=(0.7, 0.7, 0.7), width=0.8)
    page.insert_text((50, 825), "Confidential Training Circular - For Cadre Competency Evaluation Only", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))
    page.insert_text((490, 825), "Page 1 of 1", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))

    doc.save(output_path)
    doc.close()
    print(f"Created: {output_path}")


def create_mospi_national_accounts_handbook(output_path: str):
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4

    # Header and Title
    page.insert_text((50, 60), "CENTRAL STATISTICS OFFICE (CSO) / MoSPI", fontsize=13, fontname="helv", color=(0.1, 0.35, 0.25))
    page.insert_text((50, 78), "National Accounts Division, Government of India, New Delhi", fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
    page.draw_line((50, 88), (545, 88), color=(0.15, 0.45, 0.35), width=1.5)

    page.insert_text((50, 115), "Methodological Guidelines: National Accounts Statistics & GVA Estimation", fontsize=14, fontname="hebo", color=(0.05, 0.2, 0.15))

    body_text = """
1. GROSS VALUE ADDED (GVA) AT BASIC PRICES
Under the updated System of National Accounts (SNA 2008) framework, Gross Domestic Product (GDP) is estimated from Gross Value Added (GVA) at basic prices.
Relationship:
GDP at Market Prices = GVA at Basic Prices + Product Taxes - Product Subsidies
Basic price is the amount receivable by the producer from the purchaser for a unit of a good or service produced as output minus any tax payable, and plus any subsidy receivable, on that unit as a consequence of its production or sale. It excludes any transport charges invoiced separately by the producer.

2. CLASSIFICATION OF ECONOMIC ACTIVITIES
National accounts compile economic output across eight broad sectors:
1. Agriculture, Forestry & Fishing
2. Mining & Quarrying
3. Manufacturing
4. Electricity, Gas, Water Supply & Other Utility Services
5. Construction
6. Trade, Hotels, Transport, Communication & Broadcasting
7. Financial, Real Estate & Professional Services
8. Public Administration, Defence & Other Services

3. CONSTANT PRICE ESTIMATION (DOUBLE DEFLATION METHOD)
To measure real economic growth isolated from inflationary price fluctuations, GVA is estimated at constant base year prices. In the Double Deflation method, real output is deflated by the appropriate output price index (e.g. WPI or CPI sub-index), and intermediate consumption is independently deflated by input price indices. Where input price data is unavailable, single deflation by gross output deflator is applied as an operational approximation.

4. CONSUMER PRICE INDEX (CPI) INTEGRATION
The All-India Consumer Price Index (CPI) with base year 2012=100 measures changes over time in the general level of prices of goods and services that a reference population acquires, uses, or pays for consumption. CPI is computed using the modified Laspeyres formula with base period weights derived from the Consumer Expenditure Survey (CES).
Headline inflation is compiled by combining CPI (Rural) and CPI (Urban) into CPI (Combined).

5. DATA GOVERNANCE & REVISION POLICY
Official quarterly GDP estimates undergo scheduled revisions:
- Provisional Estimates (PE) released two months after financial year end.
- First Revised Estimates (1RE), Second Revised (2RE), and Third Revised (3RE) incorporating administrative returns from MCA21 corporate filings and final audited state government budgets.
"""

    rect = pymupdf.Rect(50, 130, 545, 800)
    page.insert_textbox(rect, body_text.strip(), fontsize=10, fontname="helv", lineheight=1.45, color=(0.15, 0.15, 0.15))
    
    # Footer
    page.draw_line((50, 810), (545, 810), color=(0.7, 0.7, 0.7), width=0.8)
    page.insert_text((50, 825), "MoSPI Official Technical Guidance Note - Mission Karmayogi Training", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))
    page.insert_text((490, 825), "Page 1 of 1", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))

    doc.save(output_path)
    doc.close()
    print(f"Created: {output_path}")


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "sample-pdfs")
    os.makedirs(out_dir, exist_ok=True)

    pdf1 = os.path.join(out_dir, "NSSTA_Survey_Sampling_Manual.pdf")
    pdf2 = os.path.join(out_dir, "MoSPI_National_Accounts_Handbook.pdf")

    create_nssta_sampling_manual(pdf1)
    create_mospi_national_accounts_handbook(pdf2)
    print("All sample PDFs successfully generated!")
