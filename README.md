A mobile application screen for the "declarer un document perdu" declarer page, designed on a non-white cream background (#F4EFE6) and strictly following a 1-column layout. Horizontal scrolling is completely disabled; all content wraps vertically. The top bar is perfectly integrated and contains only three elements: a left-aligned minimalist back arrow (←); a centered text title "Déclarer un document perdu" (text-base, font-semibold, color #1F2937); and a right-aligned notification bell icon (#4B5563, 20px). The profile icon has been removed. Below the top bar, the header area has been scaled back, featuring only the bold black title "Où et quand ?" and a 16px bottom margin. The entire form is presented as a strict single vertical column, optimized for a narrow portrait screen without horizontal content bleed.

All form fields are condensed and reflowed into a strict single column.

The first section groups 'Date de perte' and 'Heure approximative' in a vertical column, using compact white input fields with 12px rounded corners. The date picker and time picker icons remain.

The second section, stacked below, groups 'Ville' and 'Quartier' (marked 'Optionnel') in a single column. Inputs are white with 12px rounded corners and preserved placeholder text.

The third stacked section includes 'Lieu précis' (marked 'Optionnel') and the 'Suggestions rapides' group. All fields use line-clamp-2 and text-xs (11px) with leading-tight to ensure text wraps to a maximum of two lines. Suggestion tags (Marché, Transport, etc.) are arranged in compact multi-line grids, with tags wrapping intelligently within the screen width. No horizontal scrolling is allowed.

The 'Circonstances' field (marked 'Optionnel') is stacked below, maintaining a clean white text input field with full vertical alignment.

The entire form uses the 8px grid system for spacing.

Paddings: Strict 24px padding on left, right, and bottom (p-6).

Spacings: Multiples of 8px (4px, 8px, 16px, 24px, 32px, 48px).

Heights: Form inputs and buttons are exactly 48px high.

The bottom action bar is fixed, containing the pagination indicator 'Étape 4 / 5' (centered, text-sm, gray-500) and the two primary navigation buttons: 'Précédent' (minimalist text button, centered, text-gray-700) and 'Suivant →' (full-width solid dark green button, centered text white, text-medium).