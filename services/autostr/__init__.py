"""
AutoSTR v2 — Evidence Package Generator
Responsible for generating regulatory-grade evidence packages for FIU-IND, CBI, and RBI.
"""

__version__ = "2.0.0"

from .generators.fiu_xml_generator import generate_fiu_xml
from .templates.fiu_schema import FIUReportInput

__all__ = ["generate_fiu_xml", "FIUReportInput"]
