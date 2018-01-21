import { NgModule } from '@angular/core';
import { ParticleWaveComponent } from './particle-wave/particle-wave';
import { ParticleWave2Component } from './particle-wave2/particle-wave2';
@NgModule({
	declarations: [ParticleWaveComponent,
    ParticleWave2Component],
	imports: [],
	exports: [ParticleWaveComponent,
    ParticleWave2Component]
})
export class ComponentsModule {}
