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

        // On écrase directement les données cloud avec la version locale.
        // La logique de fusion anti-écrasement est déjà gérée dans saveDB()
        // du script principal — pas besoin de refusionner ici.
        // AVANT : on fusionnait, ce qui empêchait les suppressions
        // de persister (un élément supprimé localement réapparaissait
        // au prochain merge).
        await setDoc(docRef, { payload: newData });
        return { key, value: JSON.stringify(newData), shared: true };
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
