export function organizarBackupJson() {
  const ferramentasMenu = document.querySelector(".sidebar-tools");
  const telaBackup = document.querySelector("#backupMvcScreen .backup-mvc");

  if (!ferramentasMenu || !telaBackup || ferramentasMenu.dataset.backupRealocado === "true") return;

  ferramentasMenu.dataset.backupRealocado = "true";
  ferramentasMenu.classList.add("backup-tools-realocadas");

  const bloco = document.createElement("section");
  bloco.className = "backup-json-card";
  bloco.innerHTML = `
    <div class="backup-json-header">
      <div>
        <span>Documento JSON</span>
        <h3>Backup manual do aplicativo</h3>
        <p>Use esta área para exportar uma cópia dos dados ou importar um arquivo JSON salvo anteriormente. O IndexedDB continua sendo o banco local principal.</p>
      </div>
    </div>
  `;

  bloco.append(ferramentasMenu);
  telaBackup.append(bloco);

  ajustarTextosBackup(ferramentasMenu);
  atualizarIcones();
}

function ajustarTextosBackup(ferramentasMenu) {
  const titulo = ferramentasMenu.querySelector(":scope > span");
  const exportar = ferramentasMenu.querySelector("#exportInventoryBackupButton");
  const importar = ferramentasMenu.querySelector("#importInventoryBackupButton");
  const restaurar = ferramentasMenu.querySelector("#restoreReferenceStockButton");
  const rodapeStatus = document.querySelector(".sidebar-footer span");

  if (titulo) titulo.textContent = "Backup de estoque em JSON";
  if (exportar) exportar.innerHTML = `<i data-lucide="download" aria-hidden="true"></i>Exportar estoque em JSON`;
  if (importar) importar.innerHTML = `<i data-lucide="upload" aria-hidden="true"></i>Importar estoque em JSON`;
  if (restaurar) restaurar.innerHTML = `<i data-lucide="rotate-ccw" aria-hidden="true"></i>Restaurar estoque base`;
  if (rodapeStatus) rodapeStatus.textContent = "IndexedDB";
}

function atualizarIcones() {
  if (window.lucide?.createIcons) window.lucide.createIcons();
}
