# DeepSeek Harness RTL & Vazirmatn Typography 🚀

Smart Right-to-Left (RTL) layout and Vazirmatn Persian typography patch for **DeepSeek Harness** desktop application and local web interface.

---

### **In Memory of Saber Rastikerdar 🕯️**
> This project is dedicated to the memory of Saber Rastikerdar, creator of the beautiful Vazirmatn libre font family.

---

## 🛠️ Features
- **Smart Bidi Alignment**: Automatically switches paragraph direction to RTL when Persian/Arabic characters are detected, while preserving LTR alignment for English text.
- **Premium Font Pairing**:
  - **UI & General Text**: `Inter` (for Latin) + `Vazirmatn` (for Persian), with fallbacks `Segoe UI`, `-apple-system`, `sans-serif`.
  - **Code & Monospace**: `Geist Mono` (primary), with fallbacks `JetBrains Mono`, `Vazirmatn`, `monospace`.
- **Strict Code Protection**: Code blocks (`pre`, `code`), diff views, search results, and embedded terminals remain strictly LTR with monospace fonts.
- **Directional Input**: Text areas and input boxes dynamically switch to RTL for comfortable Persian typing.
- **Dual Support**: Works seamlessly in both the Electron desktop window and the local web interface (`http://127.0.0.1:19387`).

---

## 🚀 Quick Setup (Windows)

1. Close the running **DeepSeek Harness** application.
2. Run `run_setup.bat` (or right-click `setup_vazirmatn_dsh.ps1` and select **Run with PowerShell**).
3. The script will:
   - Check and install Vazirmatn font if not already present.
   - Create a safe `.bak` backup of the original `app.asar`.
   - Apply the RTL & typography patch.
4. Relaunch DeepSeek Harness.

---

## 🔄 Revert to Original State

To revert to the stock version:
Run `restore_backup_dsh.ps1` with PowerShell.
