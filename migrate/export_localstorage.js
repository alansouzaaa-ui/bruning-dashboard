/**
 * PASSO 1 — Exportar dados do localStorage
 *
 * 1. Abra o dashboard atual no Chrome
 * 2. Pressione F12 → aba "Console"
 * 3. Cole TODO este código e pressione Enter
 * 4. Um arquivo "vendas_export.json" será baixado automaticamente
 */

(function exportDashboardData() {
  const KEY       = 'bruning_eixo_alan_dashboard_v9';
  const KEY_COMIS = 'bruning_eixo_alan_comis_hist_v1';

  const vendas  = JSON.parse(localStorage.getItem(KEY)       || '[]');
  const comissoes = JSON.parse(localStorage.getItem(KEY_COMIS) || '[]');

  const payload = { vendas, comissoes, exportedAt: new Date().toISOString() };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'vendas_export.json';
  a.click();
  URL.revokeObjectURL(url);

  console.log(`✅ Exportado: ${vendas.length} vendas, ${comissoes.length} comissões`);
})();
