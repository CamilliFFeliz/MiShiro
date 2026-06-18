["budget-main.js", "budget-events-init.js", "budget-persistence-init.js"].forEach((arquivo) => {
  const modulo = document.createElement("script");
  modulo.type = "module";
  modulo.src = new URL(`./${arquivo}`, import.meta.url).href;
  document.head.append(modulo);
});
