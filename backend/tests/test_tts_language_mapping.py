import os
import unittest
from unittest.mock import patch, MagicMock

from app.services.ai_service import call_tts_api


class TestTTSLanguageMapping(unittest.TestCase):
    @patch('app.services.ai_service.requests.post')
    def test_malay_language_is_supported_for_tts(self, mock_post):
        fake_response = MagicMock()
        fake_response.raise_for_status.return_value = None
        fake_response.json.return_value = {
            'base_resp': {'status_code': 0},
            'data': {'audio': '00'}
        }
        mock_post.return_value = fake_response

        output_path = call_tts_api(
            text='hello',
            voice_name='presenter_male',
            speed=1.0,
            target_language_name='马来语'
        )

        self.assertTrue(os.path.exists(output_path))
        payload = mock_post.call_args.kwargs['json']
        self.assertEqual(payload['language_boost'], 'Malay')
        os.remove(output_path)

    @patch('app.services.ai_service.requests.post')
    def test_unknown_voice_id_from_frontend_should_pass_through(self, mock_post):
        fake_response = MagicMock()
        fake_response.raise_for_status.return_value = None
        fake_response.json.return_value = {
            'base_resp': {'status_code': 0},
            'data': {'audio': '00'}
        }
        mock_post.return_value = fake_response

        output_path = call_tts_api(
            text='hello',
            voice_name='Chinese (Mandarin)_News_Anchor',
            speed=1.0,
            target_language_name='英语'
        )

        payload = mock_post.call_args.kwargs['json']
        self.assertEqual(payload['voice_setting']['voice_id'], 'Chinese (Mandarin)_News_Anchor')
        os.remove(output_path)


if __name__ == '__main__':
    unittest.main()
