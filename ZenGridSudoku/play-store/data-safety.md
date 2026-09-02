# Google Play Data Safety Declaration — ZenGrid Sudoku

Answers to fill in the **Data Safety** section in the Google Play Console.

---

## 1. Overview Questions

- **Does your app collect or share any of the required user data types?**  
  👉 **Yes** (via Google AdMob SDK for advertising identifiers / diagnostics).

- **Is all of the user data collected by your app encrypted in transit?**  
  👉 **Yes** (HTTPS/TLS for SDK network communication).

- **Do you provide a way for users to request that their data be deleted?**  
  👉 **Yes** (Local data is deleted upon app uninstall or clearing app cache).

---

## 2. Data Types Collected & Shared (AdMob SDK)

| Data Type | Collected | Shared | Ephemeral | Purpose |
|---|---|---|---|---|
| **Device or other IDs** (Advertising ID) | Yes | Yes (Google AdMob) | No | Advertising / Analytics |
| **App info and performance** (Crash logs, diagnostics) | Yes | Yes (Google AdMob) | No | App functionality / Analytics |

*No Personal Info (Name, Email, Phone, Address), Financial Info, Location, Photos/Videos, Audio, or Health data is collected or shared.*
