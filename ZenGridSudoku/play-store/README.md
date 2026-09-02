# ZenGrid Sudoku — Google Play Publishing Pack

Everything needed to publish the signed AAB / APK to the Google Play Console.

| Doc | Purpose |
|-----|---------|
| `privacy-policy.md` | Full privacy policy text — host at a public URL (or GitHub Pages), then paste into Google Play Console. |
| `store-listing.md` | App name, short description, full description, category, and tags for the main store listing. |
| `data-safety.md` | Answers for the Google Play Data safety declaration form. |
| `content-rating.md` | Guidance for the IARC content-rating questionnaire (PEGI 3 / Everyone). |
| `target-audience-and-families.md` | Target age groups and Families Policy declarations. |
| `app-access-test-logins.md` | Reviewer credentials & access notes (no login required, 100% offline). |
| `release-notes.md` | Copy-paste release notes for Production / Open Testing releases. |
| `assets-checklist.md` | Icon, Feature Graphic, and Screenshot capture specifications. |

---

## Quick Launch Checklist

1. **Create app** in Play Console:
   - App name: **ZenGrid Sudoku**
   - Default language: **English (United States) - en-US**
   - App or game: **Game**
   - Free or paid: **Free**
2. **Privacy Policy**: Paste hosted URL under *App content → Privacy policy*.
3. **App Content Declarations**:
   - **Data Safety**: Fill out as described in `data-safety.md` (no personal data collection).
   - **Content Rating**: Fill questionnaire per `content-rating.md` (Rated Everyone / PEGI 3).
   - **Target Audience**: 13+ (or Everyone) per `target-audience-and-families.md`.
   - **App Access**: All functionality is available without special access / login (`app-access-test-logins.md`).
   - **Ads**: Yes, contains ads (non-intrusive banners and optional rewarded hints).
4. **Store Listing**:
   - Copy Title, Short Description, and Full Description from `store-listing.md`.
   - Upload `icon.png` ($512 \times 512$).
   - Upload Feature Graphic ($1024 \times 500$) and Screenshots per `assets-checklist.md`.
5. **Production Release**:
   - Upload `ZenGridSudoku.aab` from `build/ZenGridSudoku.aab` (or GamesAPK repo).
   - Paste release notes from `release-notes.md`.
   - Review and rollout!
