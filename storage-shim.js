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
      const { doc, setDoc, getDoc } = window.firestoreUtils;
      if (!db) return;

      try {
        const docRef = doc(db, "agromentor_data", key);
        const newData = JSON.parse(value);

        // Si c'est une liste (utilisateurs, messages, binômes...), on fusionne pour éviter d'écraser
        if (Array.isArray(newData)) {
          const docSnap = await getDoc(docRef);
          let currentData = [];
          if (docSnap.exists() && Array.isArray(docSnap.data().payload)) {
            currentData = docSnap.data().payload;
          }

          // Fusion intelligente : si un élément existe déjà (par email ou id), on le met à jour, sinon on l'ajoute
          const merged = [...currentData];
          newData.forEach(newItem => {
            const index = merged.findIndex(item => {
              if (item.email && newItem.email) return item.email === newItem.email;
              if (item.id && newItem.id) return item.id === newItem.id;
              return false;
            });

            if (index !== -1) {
              merged[index] = newItem; // Mise à jour
            } else {
              merged.push(newItem); // Nouvel ajout
            }
          });

          await setDoc(docRef, { payload: merged });
          return { key, value: JSON.stringify(merged), shared: true };
        } else {
          // Pour les objets simples
          await setDoc(docRef, { payload: newData });
          return { key, value, shared: true };
        }
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
