// Property names of images and photos as stored in the database.
export const props = {
  item: [
    'template'
  ],

  image: [
    'angle',
    'brightness',
    'contrast',
    'height',
    'hue',
    'mirror',
    'negative',
    'saturation',
    'sharpen',
    'width'
  ],

  photo: [
    'checksum',
    'color',
    'density',
    'filename',
    'mimetype',
    'orientation',
    'page',
    'path',
    'protocol',
    'size',
    'template'
  ],

  note: [
  ],

  get all() {
    return [
      ...props.item,
      ...props.image,
      ...props.photo,
      ...props.note
    ]
  }
}
