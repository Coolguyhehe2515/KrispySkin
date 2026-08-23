package com.krispyskin.plugin;

import org.bukkit.plugin.java.JavaPlugin;

public final class KrispySkinPlugin extends JavaPlugin {

    @Override
    public void onEnable() {
        getLogger().info("KrispySkin enabled!");
    }

    @Override
    public void onDisable() {
        getLogger().info("KrispySkin disabled!");
    }
}
