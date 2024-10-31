let connection;
let receivedData = [];
let isReceiving = false;

const connectionStatus = document.getElementById("connectionStatus");
const transferStatus = document.getElementById("transferStatus");
const saveButton = document.getElementById("saveButton");
const connectButton = document.getElementById("connectButton");

const STATUS_CLASSES = {
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

function showStatus(element, message, type) {
  element.textContent = message;
  element.style.display = "block";

  // Remove any existing status classes
  Object.values(STATUS_CLASSES).forEach((className) => {
    element.classList.remove(...className.split(" "));
  });

  // Add new status classes
  element.classList.add(...STATUS_CLASSES[type].split(" "));
}

function hideStatus(element) {
  element.style.display = "none";
}

document.getElementById("connectButton").addEventListener("click", function () {
  showStatus(connectionStatus, "Recherche des appareils Bangle.js...", "info");

  Puck.connect(function (c) {
    if (!c) {
      showStatus(
        connectionStatus,
        "Échec de la connexion. Veuillez réessayer.",
        "error",
      );
      return;
    }

    connection = c;
    showStatus(
      connectionStatus,
      "Connecté à Bangle.js ! Prêt à recevoir des données.",
      "success",
    );
    connectButton.style.display = "none";
    saveButton.style.display = "block";

    let buffer = "";

    connection.on("data", function (data) {
      buffer += data;
      const lines = buffer.split("\n");
      buffer = lines.pop();

      lines.forEach((line) => {
        if (line.trim() === "<data>") {
          isReceiving = true;
          showStatus(transferStatus, "Réception des données...", "info");
        } else if (line.trim() === "</data>") {
          isReceiving = false;
        } else if (line.trim() === "<end>") {
          showStatus(
            transferStatus,
            `Transfert terminé ! ${receivedData.length} lignes de données reçues.`,
            "success",
          );
        } else if (isReceiving && line.trim()) {
          receivedData.push(line);
          if (receivedData.length % 100 === 0) {
            showStatus(
              transferStatus,
              `Réception des données... (${receivedData.length} lignes)`,
              "info",
            );
          }
        }
      });
    });

    connection.on("disconnect", function () {
      showStatus(connectionStatus, "Bangle.js déconnecté", "error");
      connectButton.style.display = "block";
      if (receivedData.length === 0) {
        saveButton.style.display = "none";
      }
    });
  });
});

document.getElementById("saveButton").addEventListener("click", function () {
  if (receivedData.length === 0) {
    showStatus(transferStatus, "Pas de données à sauvegarder", "error");
    return;
  }

  const csvContent = receivedData.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute(
    "download",
    `donnees_bangle_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, "")}.csv`,
  );
  a.click();

  showStatus(transferStatus, "Données sauvegardées avec succès !", "success");
});
