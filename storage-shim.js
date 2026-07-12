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
      if (!db) return null;

      try {
        const docRef = doc(db, "agromentor_data", key);
        const newData = JSON.parse(value);

        // IMPORTANT : on n'effectue plus de fusion ici. script.js (saveDB)
        // calcule déjà la liste finale correcte côté client — il compare
        // aux dernières données synchronisées (LAST_SYNCED) pour récupérer
        // uniquement les ajouts faits par d'autres utilisateurs, tout en
        // respectant les suppressions faites localement. Si le shim
        // refusionnait par-dessus avec l'ancien contenu Firestore, tout
        // élément supprimé localement (utilisateur, binôme, ressource...)
        // était systématiquement réinjecté, rendant toute suppression
        // impossible. On écrit donc fidèlement ce qui est fourni.
        await setDoc(docRef, { payload: newData });
        return { key, value, shared: true };
      } catch (error) {
        console.error("Erreur d'écriture Firebase:", error);
        return null;
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
