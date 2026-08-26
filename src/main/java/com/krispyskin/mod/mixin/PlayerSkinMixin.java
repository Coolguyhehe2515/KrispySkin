package com.krispyskin.mod.mixin;

import com.krispyskin.mod.client.KrispySkinTextureManager;
import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.util.Identifier;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(AbstractClientPlayerEntity.class)
public abstract class PlayerSkinMixin {

    @Inject(
            method = "getSkinTexture",
            at = @At("HEAD"),
            cancellable = true
    )
    private void krispyskin$replaceSkin(
            CallbackInfoReturnable<Identifier> cir
    ) {
        AbstractClientPlayerEntity player =
                (AbstractClientPlayerEntity)
                        (Object) this;

        if (!(player instanceof ClientPlayerEntity)) {
            return;
        }

        Identifier krispySkin =
                KrispySkinTextureManager
                        .getActiveTexture();

        if (krispySkin != null) {
            cir.setReturnValue(krispySkin);
        }
    }
}
