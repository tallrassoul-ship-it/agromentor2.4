/* ============================================================\
   Shim de compatibilité AgroMentor — Version Synchronisée Cloud
   ============================================================ */
(function () {
  window.storage = {
    async get(key) {
      const db = window.firestoreDb;
      const { doc, getDoc } = window.firestoreUtils;
      if (!db) return null;

      try {
        const docRef = doc(db, "agromentor_data", key);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data().payload;
          return { key, value: JSON.stringify(data), shared: true };
        }
        return null;
      } catch (error) {
        console.error("Erreur de lecture Firebase:", error);
        return null;
      }
    },

    async set(key, value) {
      const db = window.firestoreDb;
      const { doc, setDoc } = window.firestoreUtils;
      if (!db) return;

      try {
        const docRef = doc(db, "agromentor_data", key);
        const newData = JSON.parse(value);

        // On écrit la liste telle qu'elle est fournie par script.js.
        // (script.js gère déjà sa propre logique de fusion si besoin dans saveDB().
        // Fusionner ici aussi empêchait toute suppression de refléter sur Firebase :
        // un élément retiré localement était systématiquement remis en place.)
        await setDoc(docRef, { payload: newData });
        return { key, value, shared: true };
      } catch (error) {
        console.error("Erreur d'écriture Firebase:", error);
      }
    },

    async delete(key) {
      const db = window.firestoreDb;
      const { doc, deleteDoc } = window.firestoreUtils;
      if (!db) return;

      try {
        const docRef = doc(db, "agromentor_data", key);
        await deleteDoc(docRef);
        return { key, deleted: true, shared: true };
      } catch (error) {
        console.error("Erreur de suppression Firebase:", error);
      }
    }
  };
})();
