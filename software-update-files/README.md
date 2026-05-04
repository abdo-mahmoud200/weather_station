# Software Update Test Files

Sample non-empty update payloads for testing the `Software Update` button.

Use them from a station control page:

1. Open `http://localhost:5173/stations/EG-001/control`.
2. Click `Software Update`.
3. Choose a file from the matching station folder.
4. Click `Upload and Install`.

Each station folder has three accepted file types:

- `firmware-1.0.1.bin`
- `sensor-calibration.pkg`
- `radio-profile.img`

These files are intentionally small test payloads. The current backend records the file name and simulates the update.

