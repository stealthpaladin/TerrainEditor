/*
Copyright 2012 Rob Chadwick (rchadwic@gmail.com)
This work is licensed under a Creative Commons 
Attribution-NonCommercial-ShareAlike 3.0 Unported License.
http://creativecommons.org/licenses/by-nc-sa/3.0/
*/
function BuildAOBufferCamera() {

    var draw_rtt = new osg.Camera();
    draw_rtt.setName("rtt_drawcamera");
    var draw_rttSize = [ 512, 512 ];
    // rttSize = [1920,1200];
    // rtt.setProjectionMatrix(osg.Matrix.makePerspective(60, 1, .1, 10000));
    //rtt.setProjectionMatrix(osg.Matrix.makeOrtho(-1, 1, -1, 1, .1, 10000.0));
    draw_rtt.setRenderOrder(osg.Camera.PRE_RENDER, 0);
    draw_rtt.setReferenceFrame(osg.Transform.ABSOLUTE_RF);
    draw_rtt.setViewport(new osg.Viewport(0, 0, draw_rttSize[0], draw_rttSize[1]));

    var draw_rttTexture = new osg.Texture();

    draw_rttTexture.wrap_s = 'CLAMP_TO_EDGE';
    draw_rttTexture.wrap_t = 'CLAMP_TO_EDGE';
    draw_rttTexture.setTextureSize(draw_rttSize[0], draw_rttSize[1]);
    draw_rttTexture.setMinFilter('LINEAR');
    draw_rttTexture.setMagFilter('LINEAR');

    draw_rtt.attachTexture(gl.COLOR_ATTACHMENT0, draw_rttTexture, 0);

    draw_rtt.setClearDepth(1.0);
    draw_rtt.setClearMask(gl.DEPTH_BUFFER_BIT);
    
    // rtt.setStateSet(new osg.StateSet());
   // draw_rtt.getOrCreateStateSet().setAttribute(GetPickShader());
    draw_rtt.getOrCreateStateSet().setAttribute(new osg.BlendFuncSeparate("ONE", "ZERO","ONE", "ZERO"));
   
    draw_rtt.setClearColor([ 0, 0, 0, 1 ]);
    //rtt.getOrCreateStateSet().setAttribute(new osg.Depth('ALWAYS'));
    //draw_rtt.getOrCreateStateSet().setAttribute(new osg.CullFace());
   
   // draw_rtt.getOrCreateStateSet().addUniform(osg.Uniform.createFloat3([1,1,1], "randomColor"));
    WebGL.AOBufferCam = draw_rtt;
    WebGL.AOBufferTexture = draw_rttTexture;
    
    var quad =  osg.createTexuredQuad(-1,-1,0,
            2, 0 ,0,
            0, 2,0);
    quad.getOrCreateStateSet().setAttribute(GetAOShader());
    quad.getOrCreateStateSet().setTextureAttribute(0,draw_rttTexture);
    WebGL.AOFrameCount = osg.Uniform.createFloat1([1], "aoframecount");
    WebGL.AOSampleVec = osg.Uniform.createFloat4([0,0,0,0],"RandomVec");
    quad.getOrCreateStateSet().addUniform(WebGL.AOFrameCount);
    quad.getOrCreateStateSet().addUniform(WebGL.AOSampleVec);
    WebGL.AOBufferCam.addChild(quad);
    
    var diffusetex3 = osg.Texture.create("./Assets/Textures/noise.jpg");
    quad.getOrCreateStateSet().setTexture(1, diffusetex3);
    quad.getOrCreateStateSet().addUniform(osg.Uniform.createInt1(1,"noisemap"));
    quad.getOrCreateStateSet().addUniform(WebGL.gTimeUniform);
    //document.getElementById('HeightmapPreview').appendChild(draw_rttTexture.image); 
}


function GetAOShader() {

    var vertshader = [
	    "",
	    "#ifdef GL_ES",
	    "precision highp float;",
	    "#endif",
	    "attribute vec3 Vertex;",
	   
	    "attribute vec2 TexCoord0;",
	   
	    
	    "varying vec2 oTC0;",
	    
	    
	    "vec4 ftransform() {",
	    "return vec4(Vertex, 1.0);",
	    "}",
	    "",
	    "void main() {",
	    "gl_Position = ftransform();",
	   
	    "oTC0 = TexCoord0;",
	   
	    "}" ].join('\n');

    var fragshader = [
	    "",
	    "#ifdef GL_ES",
	    "precision highp float;",
	    "#endif",
	   
	    "varying vec2 oTC0;",
	    "uniform sampler2D texture;",
	    "uniform sampler2D heightmap;",
	    "uniform sampler2D noisemap;",
	    
	    "uniform vec4 PaintPosition;",
	    "uniform vec4 PaintOptions;",
	    "uniform vec4 TexturePaintChoice;",
	    "uniform vec4 RandomVec;",
	    "uniform float aoframecount;",
	    "uniform int time;",
	    "  vec4 SRGB_to_Linear(vec4 incolor)",
		  "  {",
		  "   ",
		  "     float dist = length(incolor);",
		  "     if(dist > .04045)",
		  "  	dist = pow((dist + .055)/1.055 ,2.4);",
		  "     else",
		  "  	dist = dist/12.92;",
		  "     incolor= normalize(incolor)*dist;   ",
		  "     return incolor;",
		  "  }",

	    "vec4 packFloatToVec4i(const float value)",
	    "{",
	    "  const vec4 bitSh = vec4(255.0*255.0*255.0, 255.0*255.0, 255.0, 1.0);",
	    "  const vec4 bitMsk = vec4(0.0, 1.0/255.0, 1.0/255.0, 1.0/255.0);",
	    "  vec4 res = fract(value * bitSh);",
	    "  res -= res.xxyz * bitMsk;",
	    "  return res;",
	    "}",
	    "float unpackFloatFromVec4i(const vec4 value)",
	    "{",
	    "  const vec4 bitSh = vec4(1.0/(255.0*255.0*255.0), 1.0/(255.0*255.0), 1.0/255.0, 1.0);",
	    "  return(dot(value, bitSh));", "}", 
	    "mat3 transpose3(mat3 val)" +
	    "{" +
	    "   return  mat3(vec3(val[0][0],val[0][1],val[0][2]),vec3(val[1][0],val[1][1],val[1][2]),vec3(val[2][0],val[2][1],val[2][2]));" +
	    
	    "}",
	    "float TestVec(vec3 testvec,vec3 vert)" +
	    "{" +
	    " float tmax = 1.0;",
	    " float tmin = 0.0;",
	    " float steps = 10.0;",
	    "  for(float i = 0.0; i < 1.0; i+=.1)" +
	    "  {" +
	   
	    "     vec3 testpos = vert + testvec * i;" +
	    "     vec2 testuv = testpos.xz;" +
	    "     float ty = unpackFloatFromVec4i(texture2D(heightmap,testuv)); " +
	    "     if(ty > testpos.y)" +
	    "		return 1.0-i;" +
	    "  }" +
	    " return 0.0;" +
	    "}",
	    "void main() {", 
	     "if(aoframecount == 1.0)" +
	     "{" +
	     "gl_FragColor = vec4(0.0,0.0,0.0,0.0);" +
	     "return;" +
	     "}",
	    "vec4 cbase = texture2D(texture,oTC0.xy);",
	 
	    "if(aoframecount == 1.0)" +
	    "{ gl_FragColor = vec4(1.0,1.0,1.0,1.0); return;}" +
	  
	    "float base = (cbase.r)* ((aoframecount-1.0)/aoframecount); ;",
	   
	    
	    "float h = unpackFloatFromVec4i(texture2D(heightmap,oTC0.xy)) * 1.0;",
	    
	    "vec4 vert = vec4(oTC0.x,h,oTC0.y,1.0);",
	    "vec3 leftvert = vec3(oTC0.x + (1.0/512.0),unpackFloatFromVec4i(texture2D(heightmap,oTC0 + vec2(1.0/512.0,0))) * 1.0,oTC0.y);",
	    "vec3 frontvert = vec3(oTC0.x,unpackFloatFromVec4i(texture2D(heightmap,oTC0+ vec2(0,1.0/512.0))) * 1.0,oTC0.y+ (1.0/512.0));",
	    "vec3 left = normalize(leftvert - vert.xyz);",
	    "vec3 front = normalize(frontvert - vert.xyz);",
	    
	    "vec3 norm = normalize(cross(front,left));",
	    "left = cross(norm,front);",
	    "mat3 invtangentspace = transpose3(mat3(front,left,norm));",
	    "vec4 noise = texture2D(noisemap,(oTC0+normalize(RandomVec).xy)*2.0)-.5;",
	    "noise.z = 0.005;",
	    "noise *= 100.0;",
	    "noise = normalize(noise);",
	    "gl_FragColor = vec4(base + (TestVec(invtangentspace * noise.xyz*.4,vert.xyz))/(aoframecount));",
	    "gl_FragColor.a = 1.0;",
	    
	    "}" ].join('\n');

    var Frag = osg.Shader.create(gl.FRAGMENT_SHADER, fragshader);
    var Vert = osg.Shader.create(gl.VERTEX_SHADER, vertshader);

    var Prog = osg.Program.create(Vert, Frag);
    return Prog;

}