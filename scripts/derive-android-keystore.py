"""Build a stable PKCS12 APK signer from one 256-bit GitHub secret.

The public certificate is versioned; the private scalar and generated keystore
exist only on the CI runner. Never print the seed or derived password.
"""
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

CERT = Path(__file__).resolve().parents[1] / 'android' / 'signing-public.pem'
# P-256 curve order; prohibit an invalid scalar instead of silently reducing it.
ORDER = int('FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551', 16)
SEED = os.environ.get('ANDROID_SIGNING_SEED', '')
if not re.fullmatch(r'[0-9a-fA-F]{64}', SEED) or not 0 < int(SEED, 16) < ORDER:
    sys.exit('ANDROID_SIGNING_SEED must be exactly 64 hexadecimal characters (one secret).')
if len(sys.argv) != 2:
    sys.exit('Usage: derive-android-keystore.py OUTPUT.p12')
scalar = bytes.fromhex(SEED)
password = hashlib.sha256(b'idlearc-p12-v1\x00' + scalar).hexdigest()
output = Path(sys.argv[1]).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
env = {**os.environ, 'PKCS12_PASS': password}
with tempfile.TemporaryDirectory() as tmp:
    private_der = Path(tmp) / 'private.der'
    private_pem = Path(tmp) / 'private.pem'
    # RFC 5915 ECPrivateKey: version=1, scalar, namedCurve=prime256v1.
    private_der.write_bytes(bytes.fromhex('30310201010420') + scalar + bytes.fromhex('a00a06082a8648ce3d030107'))
    subprocess.run(['openssl', 'pkey', '-inform', 'DER', '-in', str(private_der), '-out', str(private_pem)],
                   check=True, stdout=subprocess.DEVNULL)
    expected = subprocess.check_output(['openssl', 'pkey', '-in', str(private_pem), '-pubout', '-outform', 'DER'])
    cert_pub = subprocess.check_output(['openssl', 'x509', '-in', str(CERT), '-pubkey', '-noout'])
    actual = subprocess.check_output(['openssl', 'pkey', '-pubin', '-outform', 'DER'], input=cert_pub)
    if expected != actual:
        sys.exit('Signing seed does not match the public release certificate. Do not publish an incompatible update.')
    subprocess.run(['openssl', 'pkcs12', '-export', '-inkey', str(private_pem), '-in', str(CERT),
                    '-out', str(output), '-name', 'idlearc-guide', '-passout', 'env:PKCS12_PASS'],
                   check=True, env=env, stdout=subprocess.DEVNULL)
if os.environ.get('GITHUB_ENV'):
    with open(os.environ['GITHUB_ENV'], 'a', encoding='utf-8') as settings:
        settings.write(f'ANDROID_KEYSTORE_PASSWORD={password}\n')
        settings.write(f'ANDROID_KEY_PASSWORD={password}\n')
        settings.write('ANDROID_KEY_ALIAS=idlearc-guide\n')
print('Release keystore derived; public certificate matches. No private key stored in repository.')
