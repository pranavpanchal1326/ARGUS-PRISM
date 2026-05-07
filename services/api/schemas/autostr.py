from enum import Enum


class AutoSTRStatus(str, Enum):
    PENDING = "PENDING"
    GENERATED = "GENERATED"
    APPROVED = "APPROVED"
    SUBMITTED = "SUBMITTED"
    REJECTED = "REJECTED"


class AutoSTRPackageType(str, Enum):
    FIU_IND_XML = "FIU_IND_XML"
    CBI_PDF = "CBI_PDF"
    RBI_REPORT = "RBI_REPORT"

# Full schemas implemented in Phase 5A
# Do not add fields here — wait for Phase 5A prompt
