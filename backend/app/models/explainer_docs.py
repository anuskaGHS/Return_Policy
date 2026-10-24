from typing import Optional
from pydantic import BaseModel


class SourceDocument(BaseModel):
    id: str
    title: str
    publisher: str
    url: str
    published_on: str
    event_start: Optional[str] = None
    event_end: Optional[str] = None
    kind: str
    source_type: str
    sectors: list[str]
    summary: str
    extract: Optional[str] = None
    accessed_on: str


class RetrievedDocument(SourceDocument):
    score: int
    matched_sectors: list[str]


class RetrievalResult(BaseModel):
    mode: str
    documents: list[RetrievedDocument]
    fallback_reason: Optional[str] = None


class ExplainerDocumentsData(BaseModel):
    schema_version: int = 1
    documents: list[SourceDocument]
