"""
End-to-End Test Suite for Phase 5: APDCL Billing Settlement & Tariff Verification
Verifies:
1. AERC FY 2026-27 Domestic-A telescopic slabs (Petition No. 20 of 2025).
2. Proper inclusion of all components: Base Energy, GoA Targeted Subsidy, Net Energy,
   Fixed Demand Charge (₹70/kW), FPPPA surcharge (₹0.20/unit), and Assam Electricity Duty (5.0%).
3. True Net Metering (1:1 unit banking) vs Gross Metering (EXIM feed-in credit at APPC rate).
4. Export credit benchmark verified at AERC APPC rate (₹3.20/kWh), not arbitrary ₹5.20 or retail rate.
5. Mathematical calculations tested against official APDCL bill structures.
"""

import sys
import os
import json
import asyncio

PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_DIR)

import database
import main

class MockRequest:
    def __init__(self, json_data):
        self._data = json_data
    async def json(self):
        return self._data

def run_tests():
    print("======================================================================")
    print("PHASE 5: APDCL TARIFF VERIFICATION & BILLING ENGINE TEST SUITE")
    print("======================================================================")
    
    # 1. Test Tariff Config Endpoint
    tariff_cfg = asyncio.run(main.get_billing_tariff_config())
    assert tariff_cfg["tariff_order_ref"] == "AERC Tariff Order on APDCL Petition No. 20 of 2025 (FY 2026-27)", f"Unexpected ref: {tariff_cfg['tariff_order_ref']}"
    assert tariff_cfg["tariff_effective_date"] == "2026-04-01", f"Unexpected effective date: {tariff_cfg['tariff_effective_date']}"
    assert tariff_cfg["fixed_charge_per_kw"] == 70.0, f"Expected fixed charge 70.0, got {tariff_cfg['fixed_charge_per_kw']}"
    assert tariff_cfg["fpppa_rate"] == 0.20, f"Expected FPPPA 0.20, got {tariff_cfg['fpppa_rate']}"
    assert tariff_cfg["electricity_duty_pct"] == 5.0, f"Expected duty 5.0, got {tariff_cfg['electricity_duty_pct']}"
    assert tariff_cfg["export_settlement_rate"] == 3.20, f"Expected APPC 3.20, got {tariff_cfg['export_settlement_rate']}"
    assert len(tariff_cfg["slabs"]) == 5, f"Expected 5 slabs, got {len(tariff_cfg['slabs'])}"
    print("[PASS] 1. Tariff Configuration successfully verified against AERC FY 2026-27 Order.")

    # 2. Test Pure Domestic Consumer (No Solar) - 180 units @ 3 kW
    calc_180 = database.calculate_apdcl_lt2_bill(180, sanctioned_kw=3.0)
    assert calc_180["base_energy_charge"] == 1156.20
    assert calc_180["govt_subsidy"] == 268.20
    assert calc_180["net_energy_charge"] == 888.00
    assert calc_180["fixed_charge"] == 210.00
    assert calc_180["fpppa_charge"] == 36.00
    assert calc_180["electricity_duty"] == 54.90
    assert calc_180["total_bill"] == 1188.90
    print(f"[PASS] 2. Domestic Consumer (180 units) verified to exact paisa: Total = Rs {calc_180['total_bill']}")

    # 3. Test Net-Metered Solar (Net Import = 50 kWh: 150 Import, 100 Export)
    req_net_imp = MockRequest({
        "import_kwh": 150,
        "export_kwh": 100,
        "sanctioned_kw": 3.0,
        "metering_mode": "net_metering",
        "self_consumed_kwh": 50.0
    })
    res_net_imp = asyncio.run(main.calculate_custom_bill(req_net_imp))
    assert res_net_imp["net_units"] == 50.0
    assert res_net_imp["is_net_import"] is True
    assert res_net_imp["estimated_net_bill"] == 453.62
    assert res_net_imp["bill_without_solar"] == 1325.20
    assert res_net_imp["estimated_savings_inr"] == 871.58
    assert res_net_imp["banked_surplus_kwh"] == 0.0
    print(f"[PASS] 3. Net-Metered Net Import (50 kWh net) verified: Net Bill = Rs {res_net_imp['estimated_net_bill']}, Savings = Rs {res_net_imp['estimated_savings_inr']}")

    # 4. Test Net-Metered Solar (Net Surplus = 80 kWh: 100 Import, 180 Export)
    req_net_surp = MockRequest({
        "import_kwh": 100,
        "export_kwh": 180,
        "sanctioned_kw": 3.0,
        "metering_mode": "net_metering",
        "self_consumed_kwh": 40.0
    })
    res_net_surp = asyncio.run(main.calculate_custom_bill(req_net_surp))
    assert res_net_surp["net_units"] == -80.0
    assert res_net_surp["is_net_surplus"] is True
    assert res_net_surp["banked_surplus_kwh"] == 80.0
    assert res_net_surp["surplus_credit_inr"] == 256.00  # 80 kWh * 3.20 APPC
    # Fixed charge (210) + 5% duty (10.50) = 220.50
    assert res_net_surp["estimated_net_bill"] == 220.50
    print(f"[PASS] 4. Net-Metered Net Surplus (80 kWh banked) verified: Bill = Rs {res_net_surp['estimated_net_bill']}, Banked = {res_net_surp['banked_surplus_kwh']} kWh, APPC Credit = Rs {res_net_surp['surplus_credit_inr']}")

    # 5. Test Gross Metering (EXIM) vs Net Metering Contrast
    req_exim = MockRequest({
        "import_kwh": 100,
        "export_kwh": 180,
        "sanctioned_kw": 3.0,
        "metering_mode": "gross_metering",
        "self_consumed_kwh": 40.0
    })
    res_exim = asyncio.run(main.calculate_custom_bill(req_exim))
    assert res_exim["metering_mode"] == "gross_metering"
    assert res_exim["import_bill"]["total_bill"] == 686.75
    assert res_exim["export_credit_inr"] == 576.00   # 180 * 3.20
    assert res_exim["estimated_net_bill"] == 110.75  # 686.75 - 576.00
    print(f"[PASS] 5. Gross EXIM Metering verified: Import Bill = Rs {res_exim['import_bill']['total_bill']}, Export Credit = Rs {res_exim['export_credit_inr']}, Net Payable = Rs {res_exim['estimated_net_bill']}")

    # 6. Test Billing Reconciliation Endpoint (Starts empty, no fake readings)
    rec_res = asyncio.run(main.get_billing_reconciliation())
    assert rec_res["has_reconciliation"] is False
    assert "Enter at least 2 APDCL meter readings" in rec_res["message"]
    print(f"[PASS] 6. Billing Reconciliation endpoint verified: Honest zero state without fabricated values.")

    print("======================================================================")
    print("ALL PHASE 5 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("======================================================================")

if __name__ == "__main__":
    run_tests()
