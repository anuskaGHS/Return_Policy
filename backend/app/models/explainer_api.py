from typing import Literal
from pydantic import BaseModel, Field


class ExplainerAnalyzeRequest(BaseModel):
    fund_id: str
    period: str = "1Y"
    language: Literal["en", "hi"] = "en"
