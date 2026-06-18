["budget-main.js", "budget-events-init.js", "budget-persistence-init.js"].forEach((arquivo) => {
  const modulo = document.createElement("script");
  modulo.type = "module";
  modulo.src = `./${arquivo}`;
  document.head.append(modulo);
});
