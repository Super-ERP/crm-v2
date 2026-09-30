import argparse
import contextlib
import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from run_logged import observed_failures, redact, run
from build_comparison import safe


class AuditTests(unittest.TestCase):
    def test_partial_legacy_success_is_not_success(self):
        self.assertEqual(observed_failures("inserted: 0 failed: 318\ninserted: 0 failed: 607\nuser failed (x): conflict\n=== IMPORTED: 1000 read, 0 inserted ==="), 926)
        self.assertEqual(observed_failures('"failed": 0'), 0)

    def test_database_credentials_redacted(self):
        self.assertEqual(redact('error postgres://user:secret@host/db'), 'error [DATABASE_URL REDACTED]')
        self.assertNotIn('secret', redact('postgresql://user:secret@host/db'))

    def test_spreadsheet_formula_text_escaped(self):
        self.assertEqual(safe('=HYPERLINK("x")'), '\'=HYPERLINK("x")')
        self.assertEqual(safe('001ABC'), '001ABC')
        self.assertEqual(safe(12), 12)

    def test_preflight_failure_is_logged(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {}, clear=True):
            out = Path(folder) / 'run'
            args = argparse.Namespace(snapshot=folder, repo=folder, data=folder, out=out, tenant='test', commit=False, owner=None, quote_funnel_map=None)
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(run(args), 1)
            state = json.loads((out / 'run.json').read_text())
            self.assertFalse(state['completed'])
            self.assertIn('DATABASE_ADMIN_URL', state['error'])
            self.assertEqual([json.loads(x)['event'] for x in (out / 'events.jsonl').read_text().splitlines()], ['started', 'error', 'finished'])
            with self.assertRaises(FileExistsError):
                run(args)


if __name__ == '__main__':
    unittest.main()
