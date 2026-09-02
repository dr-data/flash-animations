(() => {
  "use strict";

  const catalogUrl = new URL("catalog.json", window.location.href);
  const list = document.querySelector("#projectList");
  const search = document.querySelector("#search");
  const count = document.querySelector("#count");

  let projects = [];

  function render(filter = "") {
    const query = filter.trim().toLowerCase();
    list.textContent = "";

    const visible = projects
      .map(project => {
        const simulations = project.simulations.filter(simulation => {
          const haystack = `${project.title} ${project.id} ${simulation.name}`.toLowerCase();
          return haystack.includes(query);
        });
        return { ...project, simulations };
      })
      .filter(project => project.simulations.length > 0);

    const simulationCount = visible.reduce((total, project) => total + project.simulations.length, 0);
    count.textContent = `${simulationCount} simulations in ${visible.length} projects`;

    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No simulations matched your search.";
      list.append(empty);
      return;
    }

    for (const project of visible) {
      const card = document.createElement("article");
      card.className = "project-card";

      const header = document.createElement("div");
      header.className = "project-card__header";
      header.innerHTML = `<h2>${project.title}</h2><p>${project.id}</p>`;

      const simList = document.createElement("ul");
      simList.className = "sim-list";

      for (const simulation of project.simulations) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        const playerUrl = new URL("player.html", window.location.href);
        playerUrl.searchParams.set("src", simulation.path);
        playerUrl.searchParams.set("title", simulation.name);
        link.href = playerUrl.pathname + playerUrl.search;
        link.innerHTML = `<strong>${simulation.name}</strong><span>Open interactive SWF</span>`;
        item.append(link);
        simList.append(item);
      }

      card.append(header, simList);
      list.append(card);
    }
  }

  async function init() {
    const response = await fetch(catalogUrl);
    const data = await response.json();
    projects = data.projects;
    render();
    search.addEventListener("input", () => render(search.value));
  }

  init().catch(error => {
    list.innerHTML = `<div class="empty">Could not load catalog: ${error.message}</div>`;
  });
})();
