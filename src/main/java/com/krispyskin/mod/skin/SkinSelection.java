package com.krispyskin.mod.skin;

public final class SkinSelection {

    private static int selectedSkin = 0;

    private static String selectedSkinId;

    private SkinSelection() {
    }

    public static int getSelectedSkin() {
        return selectedSkin;
    }

    public static void setSelectedSkin(
            int index
    ) {
        selectedSkin = Math.max(
                0,
                index
        );
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

    public static String getSelectedSkinId() {
        return selectedSkinId;
    }

    public static void setSelectedSkinId(
            String skinId
    ) {
        selectedSkinId = skinId;
    }
}
