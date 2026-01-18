export default {
  // Custom template functions
  functions: {
    // Sort by date descending
    sortDate: (list) => [...list].sort((a, b) =>
      new Date(b.data.date) - new Date(a.data.date)
    ),
  },
}
