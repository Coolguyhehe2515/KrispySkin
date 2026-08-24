package com.krispyskin.mod.skin;

public final class SkinSelection {

    private static int selectedSkin = 0;

    private SkinSelection() {
    }

    public static int getSelectedSkin() {
        return selectedSkin;
    }

    public static void next() {
        selectedSkin++;
    }

    public static void previous() {
        selectedSkin--;

        if (selectedSkin < 0) {
            selectedSkin = 0;
        }
    }
}
