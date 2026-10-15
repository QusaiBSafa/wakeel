export type AccountTab = 'wa' | 'team' | 'plan' | 'sections';

export const ACCOUNT_TABS: AccountTab[] = ['wa', 'team', 'plan', 'sections'];

// Hidden for now: not shown in the tabs and ?tab= falls back to واتساب. Remove a tab from this list to bring it back.
export const HIDDEN_ACCOUNT_TABS: AccountTab[] = ['team', 'plan'];

export const VISIBLE_ACCOUNT_TABS = ACCOUNT_TABS.filter((t) => !HIDDEN_ACCOUNT_TABS.includes(t));
