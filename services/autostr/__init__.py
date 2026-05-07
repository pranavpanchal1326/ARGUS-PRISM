"""
AutoSTR v2 — Evidence Package Generator
Responsible for generating regulatory-grade evidence packages for FIU-IND, CBI, and RBI.
"""

__version__ = "2.0.0"

from .fiu_xml_generator import generate_fiu_xml
from .schemas.fiu_schema import FIUReportInput

__all__ = ["generate_fiu_xml", "FIUReportInput"]
