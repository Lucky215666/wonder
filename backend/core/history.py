import json
import os
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional


class HistoryManager:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def save(
        self,
        file_name: str,
        model: str,
        reading_card: str,
        relation_analysis: str,
        writing_materials: str,
        todo_list: str,
        full_report: str,
        tags: List[str] = None,
    ) -> str:
        record_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = re.sub(r'[\\/:*?"<>|]', "_", file_name)

        # Save full report as markdown
        md_path = os.path.join(self.output_dir, f"{timestamp}_{safe_name}_analysis.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(full_report)

        # Save record as JSON
        record = {
            "id": record_id,
            "file_name": file_name,
            "created_at": datetime.now().isoformat(),
            "model": model,
            "tags": tags or [],
            "summary": self._extract_summary(reading_card),
            "reading_card": reading_card,
            "relation_analysis": relation_analysis,
            "writing_materials": writing_materials,
            "todo_list": todo_list,
            "report_path": md_path,
        }

        json_path = os.path.join(self.output_dir, f"{record_id}_record.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)

        return record_id

    def list_items(self) -> List[Dict[str, Any]]:
        items = []
        for filename in os.listdir(self.output_dir):
            if filename.endswith("_record.json"):
                filepath = os.path.join(self.output_dir, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    record = json.load(f)
                items.append({
                    "id": record["id"],
                    "file_name": record["file_name"],
                    "created_at": record["created_at"],
                    "model": record["model"],
                    "summary": record["summary"],
                    "tags": record.get("tags", []),
                })
        items.sort(key=lambda x: x["created_at"], reverse=True)
        return items

    def get_item(self, record_id: str) -> Optional[Dict[str, Any]]:
        filepath = os.path.join(self.output_dir, f"{record_id}_record.json")
        if not os.path.exists(filepath):
            return None
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    def delete_item(self, record_id: str) -> bool:
        filepath = os.path.join(self.output_dir, f"{record_id}_record.json")
        if not os.path.exists(filepath):
            return False
        os.remove(filepath)
        return True

    def _extract_summary(self, reading_card: str) -> str:
        lines = reading_card.split("\n")
        for line in lines:
            if line.strip() and not line.startswith("#"):
                return line.strip()[:100]
        return "No summary"
