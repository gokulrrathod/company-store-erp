// Maps a backend { error, fieldErrors } response onto a react-hook-form setError function,
// so server-side validation failures surface next to the same fields as client-side ones.
export function applyServerErrors(err, setError, setFormError) {
  const data = err?.response?.data;
  if (data?.fieldErrors) {
    Object.entries(data.fieldErrors).forEach(([field, message]) => {
      setError(field, { type: 'server', message });
    });
  }
  if (setFormError) {
    setFormError(data?.error || 'Something went wrong. Please try again.');
  }
}
