import os
import subprocess
import sys
import platform
import shutil
import json
from pathlib import Path
import time
import re

import sys
import io

# Forza l'encoding UTF-8 per la console per evitare errori con le Emoji su Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, io.UnsupportedOperation):
        # Fallback per versioni vecchie di Python o ambienti limitati
        pass

def print_header(text, emoji="🚀"):
    try:
        print("\n" + "="*60)
        print(f"{emoji} {text.upper()}")
        print("="*60)
    except UnicodeEncodeError:
        # Fallback senza emoji se l'encoding fallisce ancora
        print("\n" + "="*60)
        print(f"{text.upper()}")
        print("="*60)

def print_step(step_num, total_steps, text):
    try:
        print(f"\n[{step_num}/{total_steps}] {text}")
    except UnicodeEncodeError:
        # Fallback sicuro
        clean_text = text.encode('ascii', 'ignore').decode('ascii')
        print(f"\n[{step_num}/{total_steps}] {clean_text}")

def repair_env_file(env_file, base_path, vv_root=None, python_bin=None, venv_path=None):
    """Ripara o completa un file .env esistente con percorsi REALI"""
    
    print("\n   🔧 RIPARAZIONE FILE .ENV")
    print("   " + "-"*50)
    
    # Leggi il file .env esistente
    env_vars = {}
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    
    print(f"   📋 Variabili trovate: {len(env_vars)}")
    
    # ========================================
    # RILEVAMENTO AUTOMATICO PERCORSI REALI
    # ========================================
    
    # 1. Rileva VibeVoice se non passato come parametro
    if not vv_root:
        print("\n   🔍 Ricerca automatica VibeVoice...")
        
        # Cerca in diverse posizioni possibili
        possible_paths = [
            base_path / "VibeVoice",
            base_path / "VibeVoice" / "VibeVoice",
            base_path.parent / "VibeVoice",
        ]
        
        for path in possible_paths:
            if path.exists() and (path / "setup.py").exists():
                vv_root = path
                print(f"   ✅ Trovato: {vv_root}")
                break
        
        if not vv_root:
            print(f"   ⚠️ VibeVoice non trovato automaticamente")
    
    # 2. Rileva Python venv se VibeVoice esiste
    if vv_root and vv_root.exists():
        print("\n   🔍 Ricerca Python virtual environment...")
        
        # Cerca venv con nomi comuni
        venv_names = ['env1', 'venv', 'env', '.venv']
        
        for venv_name in venv_names:
            test_venv = vv_root / venv_name
            
            if platform.system() == "Windows":
                test_python = test_venv / "Scripts" / "python.exe"
            else:
                test_python = test_venv / "bin" / "python"
            
            if test_python.exists():
                venv_path = test_venv
                python_bin = test_python
                print(f"   ✅ Trovato: {venv_name}")
                print(f"   ✅ Python: {python_bin}")
                break
        
        if not python_bin or not python_bin.exists():
            print(f"   ⚠️ Virtual environment non trovato in {vv_root}")
    
    # Variabili richieste con valori di default
    required_vars = {
        'MONGODB_URI': 'mongodb://localhost:27017/ProgettoTerapia',
        'PORT': '4000',
        'NODE_ENV': 'development',
        'JWT_SECRETE': None,
        'SMTP_HOST': 'smtp.gmail.com',
        'SMTP_PORT': '465',
        'SMTP_USER': None,
        'SMTP_PASS': None,
        'SENDER_EMAIL': None,
        'BACKEND_URL': 'http://localhost:4000',
        'FRONTEND_URL': 'http://localhost:5173',
    }
    
    missing_vars = []
    invalid_vars = []
    
    # Controlla ogni variabile
    print("\n   📊 Analisi variabili:")
    for var, default in required_vars.items():
        if var not in env_vars:
            missing_vars.append(var)
            print(f"   ❌ Mancante: {var}")
        else:
            # Controlla se ha valore valido
            if not env_vars[var] or env_vars[var] in ['your_email@gmail.com', 'your_app_password_here', 'your_16_char_app_password']:
                invalid_vars.append(var)
                print(f"   ⚠️ Placeholder: {var}")
            else:
                print(f"   ✅ OK: {var}")
    
    # Se tutto è OK, non fare nulla
    if not missing_vars and not invalid_vars:
        print(f"\n   🎉 File .env completo e valido!")
        return True
    
    print(f"\n   🔨 Riparazione necessaria:")
    print(f"   • Variabili mancanti: {len(missing_vars)}")
    print(f"   • Variabili da correggere: {len(invalid_vars)}")
    
    repair = input("\n   ❓ Vuoi riparare il file .env? (S/n): ").strip().lower()
    
    if repair == 'n':
        print(f"   ⏭️ Salto riparazione")
        return False
    
    # ========================================
    # RIPARAZIONE
    # ========================================
    
    print("\n   🔧 Riparazione in corso...")
    
    # 1. JWT_SECRETE
    if 'JWT_SECRETE' in missing_vars or 'JWT_SECRETE' in invalid_vars or not env_vars.get('JWT_SECRETE'):
        print("\n   🔐 JWT Secret:")
        import secrets
        env_vars['JWT_SECRETE'] = secrets.token_urlsafe(32)
        print(f"   ✅ Generato automaticamente")
    
    # 2. EMAIL
    email_needs_config = (
        'SMTP_USER' in missing_vars or 
        'SMTP_PASS' in missing_vars or 
        'SMTP_USER' in invalid_vars or
        'SMTP_PASS' in invalid_vars or
        not env_vars.get('SMTP_USER') or 
        not env_vars.get('SMTP_PASS') or
        env_vars.get('SMTP_USER') == 'your_email@gmail.com' or
        env_vars.get('SMTP_PASS') == 'your_app_password_here'
    )
    
    if email_needs_config:
        print("\n   📧 Configurazione Email:")
        
        # Controlla se ha già un'email valida
        if env_vars.get('SMTP_USER') and '@gmail.com' in env_vars.get('SMTP_USER') and env_vars.get('SMTP_USER') != 'your_email@gmail.com':
            print(f"   Email attuale: {env_vars['SMTP_USER']}")
            keep_email = input("   Mantenere questa email? (S/n): ").strip().lower()
            
            if keep_email == 'n':
                email_user, email_pass = get_gmail_app_password()
                if email_user and email_pass:
                    env_vars['SMTP_USER'] = email_user
                    env_vars['SMTP_PASS'] = email_pass
                    env_vars['SENDER_EMAIL'] = email_user
        else:
            email_user, email_pass = get_gmail_app_password()
            if email_user and email_pass:
                env_vars['SMTP_USER'] = email_user
                env_vars['SMTP_PASS'] = email_pass
                env_vars['SENDER_EMAIL'] = email_user
            else:
                print(f"   ⚠️ Email non configurata - dovrai configurarla manualmente")
    
    # Assicurati che SENDER_EMAIL sia uguale a SMTP_USER
    if env_vars.get('SMTP_USER') and (not env_vars.get('SENDER_EMAIL') or env_vars.get('SENDER_EMAIL') == 'your_email@gmail.com'):
        env_vars['SENDER_EMAIL'] = env_vars['SMTP_USER']
    
    # 3. MONGODB_URI
    if 'MONGODB_URI' in missing_vars or not env_vars.get('MONGODB_URI'):
        env_vars['MONGODB_URI'] = 'mongodb://localhost:27017/ProgettoTerapia'
        print(f"   ✅ MongoDB URI: {env_vars['MONGODB_URI']}")
    
    # 4. PORTS
    if 'PORT' in missing_vars or not env_vars.get('PORT'):
        env_vars['PORT'] = '4000'
    
    if 'BACKEND_URL' in missing_vars or not env_vars.get('BACKEND_URL'):
        env_vars['BACKEND_URL'] = f"http://localhost:{env_vars['PORT']}"
    
    if 'FRONTEND_URL' in missing_vars or not env_vars.get('FRONTEND_URL'):
        env_vars['FRONTEND_URL'] = 'http://localhost:5173'
    
    # 5. NODE_ENV
    if 'NODE_ENV' in missing_vars or not env_vars.get('NODE_ENV'):
        env_vars['NODE_ENV'] = 'development'
    
    # 6. SMTP CONFIG
    if 'SMTP_HOST' in missing_vars or not env_vars.get('SMTP_HOST'):
        env_vars['SMTP_HOST'] = 'smtp.gmail.com'
    
    if 'SMTP_PORT' in missing_vars or not env_vars.get('SMTP_PORT'):
        env_vars['SMTP_PORT'] = '465'
    
    # ========================================
    # SCRIVI IL FILE .ENV RIPARATO
    # ========================================
    
    env_content = f"""# ================================
# PEPPER FEEL GOOD - CONFIGURATION
# Aggiornato automaticamente da setup.py
# Data: {time.strftime('%Y-%m-%d %H:%M:%S')}
# ================================

# DATABASE
MONGODB_URI={env_vars.get('MONGODB_URI', 'mongodb://localhost:27017/ProgettoTerapia')}
PORT={env_vars.get('PORT', '4000')}
NODE_ENV={env_vars.get('NODE_ENV', 'development')}

# SECURITY
JWT_SECRETE={env_vars.get('JWT_SECRETE', 'GENERATE_NEW_SECRET')}

# EMAIL (Gmail App Password)
# IMPORTANTE: Questa NON è la tua password Gmail normale!
# È una "App Password" generata su https://myaccount.google.com/apppasswords
SMTP_HOST={env_vars.get('SMTP_HOST', 'smtp.gmail.com')}
SMTP_PORT={env_vars.get('SMTP_PORT', '465')}
SMTP_USER={env_vars.get('SMTP_USER', 'your_email@gmail.com')}
SMTP_PASS={env_vars.get('SMTP_PASS', 'your_16_char_app_password')}
SENDER_EMAIL={env_vars.get('SENDER_EMAIL', env_vars.get('SMTP_USER', 'your_email@gmail.com'))}

# URLS
BACKEND_URL={env_vars.get('BACKEND_URL', 'http://localhost:4000')}
FRONTEND_URL={env_vars.get('FRONTEND_URL', 'http://localhost:5173')}
"""
    
    # Backup del vecchio file
    if env_file.exists():
        backup_file = env_file.parent / f".env.backup.{int(time.time())}"
        shutil.copy(env_file, backup_file)
        print(f"\n   💾 Backup creato: {backup_file.name}")
    
    # Scrivi il nuovo file
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print(f"\n   ✅ File .env riparato con successo!")
    print(f"   📝 Percorso: {env_file}")
    
    # Mostra riepilogo finale
    print(f"\n   📋 RIEPILOGO CONFIGURAZIONE:")
    print(f"   " + "="*50)
    
    if vv_root and vv_root.exists():
        print(f"   ✅ VibeVoice: {vv_root}")
    else:
        print(f"   ❌ VibeVoice: NON CONFIGURATO")
    
    if python_bin and python_bin.exists():
        print(f"   ✅ Python: {python_bin}")
    else:
        print(f"   ❌ Python venv: NON CONFIGURATO")
    
    if env_vars.get('SMTP_USER') and env_vars.get('SMTP_USER') != 'your_email@gmail.com':
        print(f"   ✅ Email: {env_vars.get('SMTP_USER')}")
    else:
        print(f"   ⚠️ Email: DA CONFIGURARE")
    
    print(f"   " + "="*50)
    
    return True

def run_command(command, cwd=None, shell=True, description="", show_output=False):
    try:
        if description:
            print(f"   ⏳ {description}...")
        
        if show_output:
            # Mostra l'output in tempo reale
            process = subprocess.Popen(
                command,
                cwd=cwd,
                shell=shell,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            for line in process.stdout:
                print(f"      {line.rstrip()}")
            
            process.wait()
            success = process.returncode == 0
            return success, ""
        else:
            result = subprocess.run(
                command, 
                cwd=cwd, 
                shell=shell, 
                check=True,
                capture_output=True,
                text=True
            )
            print(f"   ✅ Completato!")
            return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Errore: {e.stderr if hasattr(e, 'stderr') else str(e)}")
        return False, e.stderr if hasattr(e, 'stderr') else str(e)

def check_nodejs():
    """Verifica che Node.js sia installato"""
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"   ✅ Node.js installato: {version}")
        return True
    except FileNotFoundError:
        print(f"   ❌ Node.js NON installato!")
        print(f"   📥 Scarica da: https://nodejs.org/")
        return False

def check_python():
    """Verifica che Python sia installato"""
    version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    print(f"   ✅ Python installato: {version}")
    
    if sys.version_info < (3, 8):
        print(f"   ⚠️ ATTENZIONE: Python 3.8+ è consigliato per VibeVoice")
        return False
    return True

def check_git():
    """Verifica che Git sia installato"""
    try:
        result = subprocess.run(["git", "--version"], capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"   ✅ Git installato: {version}")
        return True
    except FileNotFoundError:
        print(f"   ⚠️ Git NON installato!")
        print(f"   💡 Git è necessario per clonare VibeVoice")
        print(f"   📥 Scarica da: https://git-scm.com/")
        return False

def check_nvidia_gpu():
    """Verifica se è presente una GPU NVIDIA"""
    print("\n   🎮 Rilevamento GPU NVIDIA...")
    
    try:
        # Prova con nvidia-smi (comando standard NVIDIA)
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,driver_version,memory.total", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0 and result.stdout.strip():
            gpu_info = result.stdout.strip().split('\n')
            print(f"   ✅ GPU NVIDIA rilevata!")
            for gpu in gpu_info:
                parts = gpu.split(',')
                if len(parts) >= 3:
                    name = parts[0].strip()
                    driver = parts[1].strip()
                    memory = parts[2].strip()
                    print(f"      • {name}")
                    print(f"      • Driver: {driver}")
                    print(f"      • VRAM: {memory}")
            return True, gpu_info[0].split(',')[0].strip()
        else:
            print(f"   ℹ️ Nessuna GPU NVIDIA rilevata")
            return False, None
            
    except FileNotFoundError:
        print(f"   ℹ️ nvidia-smi non trovato (normale se non hai GPU NVIDIA)")
        return False, None
    except Exception as e:
        print(f"   ℹ️ Impossibile rilevare GPU: {e}")
        return False, None

def get_cuda_version():
    """Rileva la versione CUDA installata"""
    try:
        result = subprocess.run(
            ["nvcc", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            # Estrai la versione CUDA dall'output
            match = re.search(r'release (\d+\.\d+)', result.stdout)
            if match:
                cuda_version = match.group(1)
                print(f"   ✅ CUDA Toolkit installato: {cuda_version}")
                return cuda_version
    except:
        pass
    
    print(f"   ℹ️ CUDA Toolkit non trovato (verrà usata la versione bundled con PyTorch)")
    return None

def check_vibevoice(base_path):
    """Verifica se VibeVoice è presente e correttamente strutturato"""
    vv_root = base_path / "VibeVoice"
    
    print("\n   🔍 Verifica installazione VibeVoice...")
    
    if not vv_root.exists():
        print(f"   ❌ Cartella VibeVoice non trovata in: {vv_root}")
        return False, vv_root
    
    # Verifica struttura
    if not (vv_root / "demo/realtime_model_inference_from_file.py").exists():
        print(f"   ⚠️ VibeVoice incompleto. File demo mancante.")
        return False, vv_root
    
    if not (vv_root / "setup.py").exists() and not (vv_root / "pyproject.toml").exists():
        print(f"   ⚠️ VibeVoice incompleto. Manca sia setup.py che pyproject.toml.")
        return False, vv_root
    
    print(f"   ✅ VibeVoice trovato e completo")
    return True, vv_root

def clone_vibevoice(base_path):
    """Clona il repository VibeVoice"""
    vv_root = base_path / "VibeVoice"
    
    print("\n   📥 CLONAZIONE VIBEVOICE DA GITHUB")
    print("   " + "-"*50)
    print(f"   Repository: https://github.com/microsoft/VibeVoice.git")
    print(f"   Destinazione: {vv_root}")
    print(f"   ⏳ Questo richiederà 2-5 minuti...")
    print()
    
    success, _ = run_command(
        "git clone https://github.com/microsoft/VibeVoice.git",
        cwd=str(base_path),
        description="Clonazione repository",
        show_output=True
    )
    
    return success

def install_pytorch(pip_path, has_gpu=False, cuda_version=None):
    """Installa PyTorch ottimizzato per la configurazione hardware"""
    
    print("\n   🔥 INSTALLAZIONE PYTORCH")
    print("   " + "-"*50)
    
    if has_gpu:
        print(f"   🎮 GPU NVIDIA rilevata → Installazione versione GPU")
        print(f"   ⚡ Questo accelererà ENORMEMENTE la generazione audio!")
        
        # Determina la versione CUDA da usare
        if cuda_version:
            cuda_major = cuda_version.split('.')[0]
            if int(cuda_major) >= 12:
                torch_cuda = "cu121"
            elif int(cuda_major) == 11:
                torch_cuda = "cu118"
            else:
                torch_cuda = "cu118"  # Default
        else:
            torch_cuda = "cu118"  # Default se CUDA non rilevato
        
        torch_install_cmd = f'"{pip_path}" install torch torchaudio --index-url https://download.pytorch.org/whl/{torch_cuda}'
        
        print(f"   📦 Versione: PyTorch con CUDA {torch_cuda}")
        print(f"   ⏳ Download in corso (può richiedere 5-10 minuti)...")
        
    else:
        print(f"   💻 GPU non rilevata → Installazione versione CPU")
        print(f"   ⚠️ La generazione audio sarà più lenta (1-2 min per storia)")
        
        choice = input("\n   ❓ Vuoi comunque installare la versione GPU manualmente? (s/N): ").strip().lower()
        
        if choice == 's':
            print(f"   📦 Installazione versione GPU (CUDA 11.8)...")
            torch_install_cmd = f'"{pip_path}" install torch torchaudio --index-url https://download.pytorch.org/whl/cu118'
        else:
            print(f"   📦 Installazione versione CPU...")
            torch_install_cmd = f'"{pip_path}" install torch torchaudio --index-url https://download.pytorch.org/whl/cpu'
        
        print(f"   ⏳ Download in corso (può richiedere 5-10 minuti)...")
    
    success, _ = run_command(torch_install_cmd, description="", show_output=True)
    
    return success

def verify_pytorch_installation(python_bin):
    """Verifica che PyTorch sia installato correttamente"""
    print("\n   🔍 Verifica installazione PyTorch...")
    
    verify_script = """
import torch
print(f"PyTorch Version: {torch.__version__}")
print(f"CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA Version: {torch.version.cuda}")
    print(f"GPU Count: {torch.cuda.device_count()}")
    print(f"GPU Name: {torch.cuda.get_device_name(0)}")
else:
    print("Running on CPU")
"""
    
    try:
        result = subprocess.run(
            [str(python_bin), "-c", verify_script],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("   " + "="*50)
            for line in result.stdout.strip().split('\n'):
                print(f"   ✅ {line}")
            print("   " + "="*50)
            return True
        else:
            print(f"   ❌ Errore verifica: {result.stderr}")
            return False
    except Exception as e:
        print(f"   ❌ Errore: {e}")
        return False

def check_mongodb():
    """Verifica che MongoDB sia in esecuzione"""
    try:
        result = subprocess.run(
            ["mongo", "--eval", "db.version()"],
            capture_output=True,
            text=True,
            timeout=5
        )
        print(f"   ✅ MongoDB raggiungibile")
        return True
    except:
        print(f"   ⚠️ MongoDB non raggiungibile (normale se non è avviato)")
        return False

def get_gmail_app_password():
    """Guida l'utente a creare una App Password di Gmail"""
    print("\n   📧 CONFIGURAZIONE EMAIL GMAIL")
    print("   " + "-"*50)
    print("""
   ⚠️ IMPORTANTE: Non usare la tua password Gmail normale!
   
   📝 COME OTTENERE UNA APP PASSWORD:
   
   1. Vai su: https://myaccount.google.com/apppasswords
   
   2. Accedi con il tuo account Gmail
   
   3. Nella sezione "App passwords":
      • Nome app: "Pepper Feel Good"
      • Clicca "Crea"
   
   4. Google ti mostrerà una password di 16 caratteri
      Esempio: "abcd efgh ijkl mnop"
   
   5. Copia quella password e incollala qui sotto
   
   💡 Nota: Gli spazi nella password non contano
   """)
    
    email = input("   📧 Inserisci la tua email Gmail: ").strip()
    
    print(f"\n   🔐 Ora genera la App Password seguendo i passaggi sopra")
    app_password = input("   🔑 Incolla qui la App Password (16 caratteri): ").strip()
    
    # Rimuovi spazi
    app_password = app_password.replace(" ", "")
    
    if len(app_password) != 16:
        print(f"   ⚠️ ATTENZIONE: La password dovrebbe essere 16 caratteri")
        print(f"   Lunghezza attuale: {len(app_password)} caratteri")
        confirm = input("   Continuare comunque? (s/N): ").strip().lower()
        if confirm != 's':
            return None, None
    
    return email, app_password

def apply_vibevoice_patches(vv_root):
    """Applica patch di compatibilità al codice di VibeVoice"""
    print(f"\n   🛠️ APPLICAZIONE PATCH DI COMPATIBILITÀ VIBEVOICE")
    print("   " + "-"*50)
    
    # 1. Patch modeling_vibevoice_streaming_inference.py
    inference_file = Path(vv_root) / "vibevoice" / "modular" / "modeling_vibevoice_streaming_inference.py"
    if inference_file.exists():
        print(f"   📝 Patching {inference_file.name}...")
        try:
            with open(inference_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Aggiungi blocco compatibilità versioni
            if "NEEDS_CACHE_PATCH" not in content:
                patch_header = """# ============================================================================
# Transformers Compatibility Layer (Added by Pepper Feel Good setup)
# ============================================================================
import packaging.version
import transformers
import inspect
TRANSFORMERS_VERSION = packaging.version.parse(transformers.__version__)
NEEDS_CACHE_PATCH = TRANSFORMERS_VERSION >= packaging.version.parse("4.57.0")
"""
                # Inserisci dopo gli import iniziali
                content = content.replace("from transformers.utils import logging", "from transformers.utils import logging\n" + patch_header)
                
                # Patch get_mask_sizes
                old_get_mask = """    def get_mask_sizes(self, cache_position):
        \"\"\"Return KV length and offset for mask creation.\"\"\"
        kv_length = self.key_cache.shape[2] if self.key_cache is not None else 0
        return kv_length, 0"""
                
                new_get_mask = """    def get_mask_sizes(self, cache_position):
        \"\"\"Return KV length and offset for mask creation.\"\"\"
        seq_len = self.key_cache.shape[2] if self.key_cache is not None else 0
        if NEEDS_CACHE_PATCH:
            max_pos = cache_position[-1] + 1 if cache_position is not None and cache_position.numel() > 0 else seq_len
            return max(seq_len, max_pos), 0
        return seq_len, 0
    
    def get_seq_length(self):
        return self.key_cache.shape[2] if self.key_cache is not None else 0"""
                
                content = content.replace(old_get_mask, new_get_mask)
                
                # Patch _ensure_cache_has_layers
                old_ensure = """def _ensure_cache_has_layers(cache):
    \"\"\"
    Ensure the cache has all required attributes for transformers >= 4.57.
    Creates MockCacheLayer wrappers to provide the expected `layers` interface.
    \"\"\"
    if cache is None:
        return cache"""
                
                new_ensure = """def _ensure_cache_has_layers(cache):
    \"\"\"
    Ensure the cache object has the appropriate layers and methods for transformers >= 4.57 compatibility.
    \"\"\"
    if not NEEDS_CACHE_PATCH or cache is None:
        return cache"""
                
                content = content.replace(old_ensure, new_ensure)
                
                # Patch _init_cache_for_generation
                old_init = """    def _init_cache_for_generation(self, generation_config, model_kwargs, batch_size, max_cache_length, device):
        \"\"\"
        Initialize cache for generation, handling different transformers versions.
        For transformers >= 4.57, returns None to let the model create the cache dynamically.
        \"\"\"
        try:
            from transformers.cache_utils import DynamicCache
            sig = inspect.signature(DynamicCache.__init__)
            if 'config' in sig.parameters:
                # transformers >= 4.57: let model handle cache creation
                return None
            else:
                # Older versions: use parent method
                prep_sig = inspect.signature(self._prepare_cache_for_generation)
                if 'device' in prep_sig.parameters:
                    self._prepare_cache_for_generation(generation_config, model_kwargs, None, batch_size, max_cache_length, device)
                else:
                    self._prepare_cache_for_generation(generation_config, model_kwargs, None, batch_size, max_cache_length)
                return model_kwargs.get("past_key_values")
        except Exception:
            return None"""
                
                new_init = """    def _init_cache_for_generation(self, generation_config, model_kwargs, batch_size, max_cache_length, device):
        \"\"\"
        Initialize cache for generation, handling different transformers versions.
        \"\"\"
        if not NEEDS_CACHE_PATCH:
            prep_sig = inspect.signature(self._prepare_cache_for_generation)
            if 'device' in prep_sig.parameters:
                self._prepare_cache_for_generation(generation_config, model_kwargs, None, batch_size, max_cache_length, device)
            else:
                self._prepare_cache_for_generation(generation_config, model_kwargs, None, batch_size, max_cache_length)
            return model_kwargs.get("past_key_values")

        try:
            from transformers.cache_utils import DynamicCache
            sig = inspect.signature(DynamicCache.__init__)
            if 'config' in sig.parameters:
                return DynamicCache(config=self.config)
            else:
                return None
        except Exception:
            return None"""
                
                content = content.replace(old_init, new_init)
                
                with open(inference_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"   ✅ Patch applicata a {inference_file.name}")
            else:
                print(f"   ✅ {inference_file.name} già patchato")
        except Exception as e:
            print(f"   ❌ Errore durante il patching di {inference_file.name}: {e}")
    else:
        print(f"   ❌ File non trovato: {inference_file}")

    # 2. Patch pyproject.toml
    pyproject_file = Path(vv_root) / "pyproject.toml"
    if pyproject_file.exists():
        print(f"   📝 Patching {pyproject_file.name}...")
        try:
            with open(pyproject_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Pin transformers
            content = content.replace('"transformers>=4.51.3,<5.0.0"', '"transformers==4.51.3"')
            
            with open(pyproject_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"   ✅ Patch applicata a {pyproject_file.name}")
        except Exception as e:
            print(f"   ❌ Errore durante il patching di {pyproject_file.name}: {e}")

    print("   " + "-"*50)

def setup():
    base_path = Path(__file__).parent.absolute()
    total_steps = 10
    
    print_header("Setup Pepper Feel Good", "🌈")
    print(f"📍 Percorso progetto: {base_path}\n")
    
    # STEP 0: Prerequisiti
    print_step(0, total_steps, "Verifica Prerequisiti")
    
    if not check_nodejs():
        print("\n⛔ ERRORE CRITICO: Installa Node.js prima di continuare!")
        input("Premi INVIO per uscire...")
        sys.exit(1)
    
    if not check_python():
        print("\n⚠️ ATTENZIONE: Versione Python non ottimale")
        choice = input("Continuare comunque? (s/N): ").strip().lower()
        if choice != 's':
            sys.exit(1)
    
    has_git = check_git()
    check_mongodb()
    
    # STEP 1: NODE.JS BACKEND
    print_step(1, total_steps, "Installazione Backend (Node.js)")
    
    server_path = base_path / "server"
    if server_path.exists():
        success, _ = run_command(
            "npm install", 
            cwd=str(server_path),
            description="Installazione moduli npm per il backend"
        )
        if not success:
            print("   ⚠️ Alcuni moduli potrebbero non essersi installati correttamente")
    else:
        print(f"   ⚠️ Cartella 'server' non trovata!")
    
    # STEP 2: NODE.JS FRONTEND
    print_step(2, total_steps, "Installazione Frontend (React)")
    
    client_path = base_path / "client"
    if client_path.exists():
        success, _ = run_command(
            "npm install",
            cwd=str(client_path),
            description="Installazione moduli npm per il frontend"
        )
        if not success:
            print("   ⚠️ Alcuni moduli potrebbero non essersi installati correttamente")
    else:
        print(f"   ⚠️ Cartella 'client' non trovata!")

    # STEP 3: VERIFICA/CLONA VIBEVOICE
    print_step(3, total_steps, "Verifica/Installazione VibeVoice")
    
    vv_exists, vv_root = check_vibevoice(base_path)
    
    if not vv_exists:
        if not has_git:
            print("\n   ⛔ Git non installato! Impossibile clonare VibeVoice automaticamente")
            print(f"\n   📝 ISTRUZIONI MANUALI:")
            print(f"   1. Installa Git da: https://git-scm.com/")
            print(f"   2. Esegui: git clone https://github.com/microsoft/VibeVoice.git")
            print(f"   3. Posiziona la cartella in: {vv_root}")
            print(f"   4. Riesegui questo script: python setup.py")
            vv_installed = False
        else:
            print(f"\n   VibeVoice non trovato. Vuoi clonarlo ora?")
            clone_choice = input("   ❓ Clonare VibeVoice da GitHub? (S/n): ").strip().lower()
            
            if clone_choice != 'n':
                if clone_vibevoice(base_path):
                    print(f"   ✅ VibeVoice clonato con successo!")
                    vv_installed = True
                else:
                    print(f"   ❌ Errore durante la clonazione")
                    vv_installed = False
            else:
                print(f"   ⏭️ Salto installazione VibeVoice")
                vv_installed = False
    else:
        vv_installed = True
        print(f"   ✅ VibeVoice già installato")

    # STEP 4: RILEVAMENTO GPU
    print_step(4, total_steps, "Rilevamento Hardware (GPU)")
    
    has_nvidia_gpu, gpu_name = check_nvidia_gpu()
    cuda_version = get_cuda_version() if has_nvidia_gpu else None

    # STEP 5: PYTHON VENV
    print_step(5, total_steps, "Configurazione Ambiente Python (IA)")
    
    venv_path = vv_root / "env1"
    
    if vv_installed:
        # Crea VENV se non esiste
        if not venv_path.exists():
            print(f"   🐍 Creazione Virtual Environment Python...")
            success, _ = run_command(
                f'"{sys.executable}" -m venv env1',
                cwd=str(vv_root),
                description="Creazione venv 'env1'"
            )
        else:
            print(f"   ✅ Virtual Environment già presente")
        
        # Determina i path in base al sistema operativo
        if platform.system() == "Windows":
            pip_path = venv_path / "Scripts" / "pip.exe"
            python_bin = venv_path / "Scripts" / "python.exe"
            activate_cmd = str(venv_path / "Scripts" / "activate.bat")
        else:
            pip_path = venv_path / "bin" / "pip"
            python_bin = venv_path / "bin" / "python"
            activate_cmd = f"source {venv_path / 'bin' / 'activate'}"

        # STEP 6: PYTORCH INSTALLATION
        print_step(6, total_steps, "Installazione PyTorch (AI Engine)")
        
        if pip_path.exists():
            # Upgrade pip
            run_command(
                f'"{pip_path}" install --upgrade pip',
                description="Aggiornamento pip"
            )
            
            # Installa PyTorch con rilevamento GPU
            pytorch_success = install_pytorch(pip_path, has_nvidia_gpu, cuda_version)
            
            if pytorch_success:
                # Verifica installazione
                verify_pytorch_installation(python_bin)
            else:
                print(f"   ⚠️ Problemi con l'installazione di PyTorch")
                vv_installed = False
        else:
            print(f"   ❌ pip non trovato in {pip_path}")
            vv_installed = False

        # STEP 7: VIBEVOICE INSTALLATION
        print_step(7, total_steps, "Installazione VibeVoice")
        
        if pip_path.exists() and vv_root.exists():

            # -------------------------------------------------------
            # FIX COMPATIBILITÀ: Fissa transformers a versione 4.51.3
            # Le versioni >= 4.57 cambiano il calcolo delle attention mask
            # e causano un RuntimeError durante la generazione audio.
            # -------------------------------------------------------
            print(f"\n   🔒 Fissaggio versione transformers (stabilità VibeVoice)...")
            transformers_fix, _ = run_command(
                f'"{pip_path}" install "transformers==4.51.3"',
                description="Installazione transformers 4.51.3",
                show_output=True
            )
            if transformers_fix:
                print(f"   ✅ transformers fissato a versione 4.51.3")
            else:
                print(f"   ⚠️ Attenzione: impossibile fissare la versione di transformers")
            # -------------------------------------------------------

            # Installa VibeVoice
            success, _ = run_command(
                f'"{pip_path}" install -e .',
                cwd=str(vv_root),
                description="Installazione VibeVoice (modalità editable)",
                show_output=True
            )
            
            if success:
                print(f"   ✅ VibeVoice configurato correttamente")
                # Applica patch di codice dopo l'installazione
                apply_vibevoice_patches(vv_root)
            else:
                print(f"   ⚠️ Problemi con l'installazione di VibeVoice")
                vv_installed = False
        else:
            print(f"   ❌ Path non validi per l'installazione VibeVoice")
            vv_installed = False
    else:
        print(f"   ⏭️ Salto configurazione Python (VibeVoice non installato)")

    # STEP 8: CARTELLE
    print_step(8, total_steps, "Creazione Struttura Cartelle")
    
    folders = [
        server_path / "uploads",
        server_path / "uploads" / "audio",
        server_path / "temp_audio"
    ]
    
    for folder in folders:
        if not folder.exists():
            folder.mkdir(parents=True, exist_ok=True)
            print(f"   📁 Creata: {folder.name}")
        else:
            print(f"   ✅ Già presente: {folder.name}")

    # STEP 9: FILE .ENV
    print_step(9, total_steps, "Configurazione File .env")
    
    env_file = server_path / ".env"
    
    # Determina i path per VibeVoice (se installato)
    if vv_installed and 'python_bin' in locals() and 'vv_root' in locals():
        repair_result = repair_env_file(
            env_file, 
            base_path, 
            vv_root=vv_root,
            python_bin=python_bin,
            venv_path=venv_path
        )
    else:
        repair_result = repair_env_file(env_file, base_path)
    
    # Se il repair non è stato fatto o ha fallito, crea da zero
    if not repair_result and not env_file.exists():
        print("\n   📝 CREAZIONE FILE .ENV DA ZERO")
        print("   " + "-"*50)
        
        # Database
        print("\n   🗄️ DATABASE:")
        mongo_uri = input("   MongoDB URI [mongodb://localhost:27017/ProgettoTerapia]: ").strip()
        if not mongo_uri:
            mongo_uri = "mongodb://localhost:27017/ProgettoTerapia"
        
        # Security
        print("\n   🔐 SICUREZZA:")
        jwt_secret = input("   JWT Secret [genera automatico? Y/n]: ").strip().lower()
        if jwt_secret != 'n':
            import secrets
            jwt_secret = secrets.token_urlsafe(32)
            print(f"   ✅ Generato: {jwt_secret}")
        else:
            jwt_secret = input("   Inserisci JWT Secret: ").strip()
        
        # Email
        email_user, email_pass = get_gmail_app_password()
        
        if not email_user or not email_pass:
            print(f"   ⚠️ Configurazione email saltata")
            email_user = "your_email@gmail.com"
            email_pass = "your_app_password_here"
        
        # Server ports
        print("\n   🌐 SERVER:")
        backend_port = input("   Porta Backend [4000]: ").strip() or "4000"
        frontend_port = input("   Porta Frontend [5173]: ").strip() or "5173"
        
        # Path assoluti per VibeVoice
        if vv_installed and 'python_bin' in locals():
            if platform.system() == "Windows":
                vv_abs_path = str(vv_root).replace("\\", "/")
                python_abs_path = str(python_bin).replace("\\", "/")
            else:
                vv_abs_path = str(vv_root)
                python_abs_path = str(python_bin)
        else:
            vv_abs_path = "PATH_TO_VIBEVOICE_NOT_CONFIGURED"
            python_abs_path = "PATH_TO_PYTHON_NOT_CONFIGURED"

        env_content = f"""# ================================
# PEPPER FEEL GOOD - CONFIGURATION
# ================================

# DATABASE
MONGODB_URI={mongo_uri}
PORT={backend_port}
NODE_ENV=development

# SECURITY
JWT_SECRETE={jwt_secret}

# EMAIL (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER={email_user}
SMTP_PASS={email_pass}
SENDER_EMAIL={email_user}

# URLS
BACKEND_URL=http://localhost:{backend_port}
FRONTEND_URL=http://localhost:{frontend_port}
"""
        
        with open(env_file, "w", encoding="utf-8") as f:
            f.write(env_content)
        
        print(f"\n   ✅ File .env creato: {env_file}")
        
    # STEP 10: VERIFICA INSTALLAZIONE
    print_step(10, total_steps, "Verifica Installazione Finale")
    
    checks = {
        "Backend npm modules": (server_path / "node_modules").exists(),
        "Frontend npm modules": (client_path / "node_modules").exists(),
        "VibeVoice clonato": vv_root.exists(),
        "Python venv": venv_path.exists() if vv_installed else False,
        "PyTorch installato": vv_installed,
        "File .env": env_file.exists(),
        "Cartella uploads": (server_path / "uploads").exists(),
    }
    
    all_good = True
    print("\n   " + "="*50)
    for check_name, status in checks.items():
        emoji = "✅" if status else "❌"
        print(f"   {emoji} {check_name}")
        if not status:
            all_good = False
    print("   " + "="*50)
    
    # ISTRUZIONI FINALI
    print("\n" + "="*60)
    if all_good:
        print("🎉 SETUP COMPLETATO CON SUCCESSO! 🎉")
    else:
        print("⚠️ SETUP COMPLETATO CON ALCUNI AVVISI")
    print("="*60)
    
    print(f"""
📋 PROSSIMI PASSI:

1️⃣ AVVIA MONGODB (se non è già in esecuzione):
   {'• Windows: Servizio MongoDB o mongod.exe' if platform.system() == 'Windows' else '• Linux/Mac: sudo systemctl start mongod'}

2️⃣ AVVIA IL BACKEND:
   cd {server_path.name}
   node server.js

3️⃣ AVVIA IL FRONTEND (nuovo terminale):
   cd {client_path.name}
   npm run dev

4️⃣ APRI IL BROWSER:
   http://localhost:{frontend_port if 'frontend_port' in locals() else '5173'}

""")
    
    if vv_installed:
        gpu_status = "🎮 GPU NVIDIA" if has_nvidia_gpu else "💻 CPU"
        print(f"""🎤 CONFIGURAZIONE VIBEVOICE:
   Modalità: {gpu_status}
   Virtual Environment: {venv_path}
   Python: {python_bin if 'python_bin' in locals() else 'N/A'}
   
   Per testare manualmente:
     cd {vv_root}
     {activate_cmd if 'activate_cmd' in locals() else 'env1/Scripts/activate'}
     python demo/realtime_model_inference_from_file.py --help
""")
        
        if has_nvidia_gpu:
            print(f"""   ⚡ ACCELERAZIONE GPU ATTIVA!
   La generazione audio sarà molto più veloce (~10-30 secondi)
   GPU: {gpu_name}
""")
        else:
            print(f"""   ℹ️ MODALITÀ CPU
   La generazione audio richiederà 1-2 minuti per storia
   
   💡 Per velocizzare, installa una GPU NVIDIA compatibile
""")
    else:
        print(f"""⚠️ VIBEVOICE NON CONFIGURATO:
   
   📝 OPZIONI:
   
   A) Installazione Automatica (raccomandato):
      1. Assicurati di avere Git installato
      2. Riesegui: python setup.py
      3. Quando richiesto, scegli 'S' per clonare VibeVoice
   
   B) Installazione Manuale:
      1. Apri terminale/cmd
      2. Vai nella cartella del progetto: cd "{base_path}"
      3. Clona: git clone https://github.com/microsoft/VibeVoice.git
      4. Riesegui: python setup.py
""")
    
    print("="*60)
    print("🌈 Buon lavoro con Pepper Feel Good!")
    print("="*60 + "\n")
    
    if not all_good:
        print("💡 Suggerimento: Controlla i messaggi di errore sopra")
        print("   e risolvi i problemi prima di avviare l'applicazione.\n")

if __name__ == "__main__":
    try:
        setup()
    except KeyboardInterrupt:
        print("\n\n⛔ Setup interrotto dall'utente")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ ERRORE CRITICO: {e}")
        import traceback
        traceback.print_exc()
        input("\nPremi INVIO per uscire...")
        sys.exit(1)