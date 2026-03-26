import os
import unittest
import uuid

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


class TestDeleteFileEndpoint(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_delete_file_should_remove_existing_file(self):
        file_name = f"test_delete_{uuid.uuid4()}.mp4"
        file_path = os.path.join(settings.TEMP_DIR, file_name)
        with open(file_path, "wb") as f:
            f.write(b"dummy")

        response = self.client.post(
            "/api/v1/delete-file",
            json={"file_name": file_name},
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(os.path.exists(file_path))

    def test_delete_file_should_reject_non_basename(self):
        response = self.client.post(
            "/api/v1/delete-file",
            json={"file_name": "../etc/passwd"},
        )

        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
