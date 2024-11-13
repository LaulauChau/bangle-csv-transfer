let connection;
let receivedData = "";
let expectedSize = 0;
let startTime;

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

	Object.values(STATUS_CLASSES).forEach((className) => {
		element.classList.remove(...className.split(" "));
	});

	element.classList.add(...STATUS_CLASSES[type].split(" "));
}

function formatFileSize(bytes) {
	if (bytes < 1024) return bytes + " B";
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
	return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

document.getElementById("connectButton").addEventListener("click", () => {
	showStatus(connectionStatus, "Recherche des appareils Bangle.js...", "info");

	Puck.connect((c) => {
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

		connection.on("data", (data) => {
			if (typeof data === "string" && data.startsWith("START:")) {
				// New transfer starting
				expectedSize = Number.parseInt(data.split(":")[1]);
				receivedData = "";
				startTime = Date.now();
				showStatus(
					transferStatus,
					`Début du transfert... (Taille totale: ${formatFileSize(expectedSize)})`,
					"info",
				);
				return;
			}

			if (data === "END") {
				// Transfer complete
				const endTime = Date.now();
				const transferTime = (endTime - startTime) / 1000; // seconds
				const transferRate = (expectedSize / 1024 / transferTime).toFixed(2); // KB/s
				showStatus(
					transferStatus,
					`Transfert terminé ! \nVitesse: ${transferRate} KB/s\nTemps: ${transferTime.toFixed(1)}s`,
					"success",
				);
				return;
			}

			// Accumulate data
			receivedData += data;
			const progress = Math.floor((receivedData.length / expectedSize) * 100);

			// Update progress every 5%
			if (progress % 5 === 0) {
				showStatus(
					transferStatus,
					`Progression: ${progress}%\nReçu: ${formatFileSize(receivedData.length)}`,
					"info",
				);
			}
		});

		connection.on("disconnect", () => {
			showStatus(connectionStatus, "Bangle.js déconnecté", "error");
			connectButton.style.display = "block";
			if (!receivedData) {
				saveButton.style.display = "none";
			}
		});
	});
});

document.getElementById("saveButton").addEventListener("click", () => {
	if (!receivedData) {
		showStatus(transferStatus, "Pas de données à sauvegarder", "error");
		return;
	}

	const blob = new Blob([receivedData], { type: "text/csv" });
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.setAttribute("href", url);
	a.setAttribute(
		"download",
		`donnees_bangle_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, "")}.csv`,
	);
	a.click();

	showStatus(transferStatus, "Données sauvegardées avec succès !", "success");
});
