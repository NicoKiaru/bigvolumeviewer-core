#define NUM_BLOCK_SCALES 10

uniform mat4 im;
uniform vec3 sourcemin;
uniform vec3 sourcemax;

void intersectBoundingBox( vec4 wfront, vec4 wback, out float tnear, out float tfar )
{
	/*vec4 mfront = im * wfront;
	vec4 mback = im * wback;
	intersectBox( mfront.xyz, (mback - mfront).xyz, sourcemin, sourcemax, tnear, tfar );*/

	    vec4 mfront = im * wfront;
        vec4 mback = im * wback;

        // Calculate ray direction more robustly
        vec3 ray_orig = mfront.xyz;
        vec3 ray_dir = mback.xyz - mfront.xyz;

        // Add special handling for near-zero ray directions to prevent missing thin volumes
        const float dir_epsilon = 1e-6;
        if (abs(ray_dir.x) < dir_epsilon && (sourcemax.x - sourcemin.x) < 1.1) {
            ray_dir.x = dir_epsilon;
        }
        if (abs(ray_dir.y) < dir_epsilon && (sourcemax.y - sourcemin.y) < 1.1) {
            ray_dir.y = dir_epsilon;
        }
        if (abs(ray_dir.z) < dir_epsilon && (sourcemax.z - sourcemin.z) < 1.1) {
            ray_dir.z = dir_epsilon;
        }

        intersectBox(ray_orig, ray_dir, sourcemin, sourcemax, tnear, tfar);

        // If the volume is thin in any dimension, ensure we find an intersection
        if (any(lessThan(sourcemax - sourcemin, vec3(1.1))) && tnear >= tfar) {
            // Force a small intersection region for very thin volumes
            float mid = (tnear + tfar) * 0.5;
            tnear = mid - 0.01;
            tfar = mid + 0.01;
        }

}

uniform sampler3D volumeCache;

// -- comes from CacheSpec -----
uniform vec3 blockSize;
uniform vec3 paddedBlockSize;
uniform vec3 cachePadOffset;

// -- comes from TextureCache --
uniform vec3 cacheSize;// TODO: get from texture!?


uniform usampler3D lutSampler;
uniform vec3 blockScales[ NUM_BLOCK_SCALES ];
uniform vec3 lutSize;
uniform vec3 lutOffset;

float sampleVolume( vec4 wpos )
{
	vec3 pos = (im * wpos).xyz + 0.5;
	vec3 q = floor( pos / blockSize ) - lutOffset + 0.5;

	uvec4 lutv = texture( lutSampler, q / lutSize );
	vec3 B0 = lutv.xyz * paddedBlockSize + cachePadOffset;
	vec3 sj = blockScales[ lutv.w ];

	vec3 c0 = B0 + mod( pos * sj, blockSize ) + 0.5 * sj;
	                                       // + 0.5 ( sj - 1 )   + 0.5 for tex coord offset

	return texture( volumeCache, c0 / cacheSize ).r;
}
